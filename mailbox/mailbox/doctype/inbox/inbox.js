{% include 'mailbox/mailbox/doctype/compose/compose.js' %};
{% include 'mailbox/mailbox/doctype/compose/attachments.js' %};
frappe.last_edited_communication = {};
frappe.ui.form.on("Inbox", "refresh", function(frm) {
	if (frm.doc.docstatus===0 && parseInt(frm.doc.__islocal)!=1){
		frm.add_custom_button(__("Forward"), function() { frm.forward_mail() });
		frm.add_custom_button(__("Reply"), function() { frm.reply_to_mail() });
	};
	if (frm.doc.docstatus===0){
		frappe.call({
			method:"mailbox.mailbox.doctype.inbox.inbox.check_contact",
			args:{"contact":frm.doc.sender},
			callback: function(r) {
				if (r.message){
					msgprint(r.message)
				}
				
			}
		});
	};	
	frm.add_custom_button(__("Compose New"), function() { new mailbox.Composer({}) });
	frm.reply_to_mail = function() {
		this.action_p = 'reply'
		make(this.action_p)	
	};
	frm.forward_mail = function(){
		this.action_p = 'forward'
		make(this.action_p)
	};
	make = function(action_p){
		var me = this;
		this.dialog = new frappe.ui.Dialog({
			title: __("Add Reply") + ": " + (frm.doc.subject || ""),
			no_submit_on_enter: true,
			fields: [
				{label:__("To"), fieldtype:"Data", reqd: 1, fieldname:"recipients"},

				{fieldtype: "Section Break"},
				{fieldtype: "Column Break"},
				{label:__("Subject"), fieldtype:"Data", reqd: 1,
					fieldname:"subject"},
				{fieldtype: "Section Break"},
				{label:__("Message"), fieldtype:"Text Editor", reqd: 1,
					fieldname:"content"},

				{fieldtype: "Section Break"},
				{fieldtype: "Column Break"},
				{label:__("Send As Email"), fieldtype:"Check",
					fieldname:"send_email"},
				{label:__("Select Attachments"), fieldtype:"HTML",
					fieldname:"select_attachments"}
			],
			primary_action_label: "Send",
			primary_action: function() {
				me.send_action();
			}
		});
		this.prepare(action_p);
		this.dialog.show();

	};
	prepare = function(action_p) {
		this.action_p = action_p
		this.setup_subject_and_recipients();
		this.setup_attach();
		this.setup_email();
		this.setup_autosuggest();
		//this.setup_last_edited_communication();
		$(this.dialog.fields_dict.recipients.input).val(this.recipients || "").change();
		$(this.dialog.fields_dict.subject.input).val(this.subject || "").change();
		this.setup_earlier_reply();
	};
	setup_subject_and_recipients = function() {
        
		this.subject = "";
		this.recipients = "";

		if(this.action_p == 'reply') {
			$(this.dialog.fields_dict.recipients.input).attr('disabled',true)
			this.recipients = frm.doc.sender
		}
		
		if(!this.subject && frm) {
			// get subject from last communication
			if(this.action_p == 'reply') {
				this.subject = frm.doc.subject;
				if(!this.recipients) {
					this.recipients = frm.doc.sender;
				}
				// prepend "Re:"
				if(strip(this.subject.toLowerCase().split(":")[0])!="re") {
					this.subject = "Re: " + this.subject;
				}
			}
			if(this.action_p == 'forward') {
				this.subject = frm.doc.subject;
				// prepend "Fwd:"
				if(strip(this.subject.toLowerCase().split(":")[0])!="fwd") {
					this.subject = "Fwd: " + this.subject;
				}
			}

			if (!this.subject) {
				this.subject = __(frm.doctype) + ': ' + frm.docname;
			}
		}
	};
	setup_attach = function() {
		if (!frm) return;

		var fields = this.dialog.fields_dict;
		var attach = $(fields.select_attachments.wrapper);

		var files = frm.get_files();
		if(files.length) {
			$("<h6 class='text-muted' style='margin-top: 12px;'>"
				+__("Add Attachments")+"</h6>").appendTo(attach.empty());
			$.each(files, function(i, f) {
				if (!f.file_name) return;
				f.file_url = frappe.urllib.get_full_url(f.file_url);

				$(repl('<p class="checkbox">'
					+	'<label><span><input type="checkbox" data-file-name="%(name)s"></input></span>'
					+		'<span class="small">%(file_name)s</span>'
					+	' <a href="%(file_url)s" target="_blank" class="text-muted small">'
					+		'<i class="icon-share" style="vertical-align: middle; margin-left: 3px;"></i>'
					+ '</label></p>', f))
					.appendTo(attach)
			});
		}
	};
	setup_email = function() {
		// email
		var me = this;
		var fields = this.dialog.fields_dict;
		$(fields.send_email.input).prop("checked", true)

		// toggle print format
		$(fields.send_email.input).click(function() {
			me.dialog.get_primary_btn().html($(this).prop("checked") ? "Send" : "Add Communication");
		});
	};
	send_action = function() {
		var me = this,
		form_values = me.dialog.get_values(),
		btn = me.dialog.get_primary_btn();

		if(!form_values) return;

		var selected_attachments = $.map($(me.dialog.wrapper)
			.find("[data-file-name]:checked"), function(element) {
				return $(element).attr("data-file-name");
			})

		me.send_email(btn, form_values, selected_attachments);
		
	};
	send_email = function(btn, form_values, selected_attachments) {
		var me = this;

		return frappe.call({
			method:"mailbox.mailbox.doctype.inbox.inbox.make",
			args: {
				recipients: form_values.recipients,
				subject: form_values.subject,
				content: form_values.content,
				doctype: frm.doc.doctype,
				name: frm.doc.name,
				send_email: form_values.send_email,
				attachments: selected_attachments,
				email_account:frm.doc.email_account,
				doc:frm.doc,
				forward_or_reply:me.action_p
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if(form_values.send_email && r.message["recipients"])
						msgprint(__("Email sent to {0}", [r.message["recipients"]]));
					me.dialog.hide();
					refresh_field("tag")
				} else {
					msgprint(__("There were errors while sending email. Please try again."));
				}
			}
		});
	};
	setup_earlier_reply = function() {
		var fields = this.dialog.fields_dict,
		signature = frappe.boot.user.email_signature || "";
		//last_email = this.last_email;

		/*if(!last_email) {
			last_email = this.frm && this.frm.comments.get_last_email(true);
		}*/

		if(!frappe.utils.is_html(signature)) {
			signature = signature.replace(/\n/g, "<br>");
		}

		if(this.txt) {
			this.message = this.txt + (this.message ? ("<br><br>" + this.message) : "");
		}

		if(this.real_name) {
			this.message = '<p>'+__('Dear') +' '
				+ this.real_name + ",</p>" + (this.message || "");
		}

		var reply = (this.message || "")
			+ (signature ? ("<br>" + signature) : "");

		if(this.action_p == 'reply') {
			//var last_email_content = last_email.original_comment || last_email.comment;
			var last_email_content = frm.doc.content;
			fields.content.set_input(reply
				+ "<br><!-- original-reply --><br>"
				+ '<blockquote>' +
					'<p>' + __("On {0}, {1} wrote:",
					[frappe.datetime.global_date_format(frm.doc.creation) , frm.doc.user]) + '</p>' +
					last_email_content +
				'<blockquote>');
		}
		if(this.action_p == 'forward') {
			//var last_email_content = last_email.original_comment || last_email.comment;
			var last_email_content = frm.doc.content;
			fields.content.set_input(reply
				+ "<br>------ Forwarded message--------<br>"
				+ '<p>' + __("From: {0} \< {1} \><br>Date:{2}<br>Subject:{3}<br>To:{4}",
					[frm.doc.sender_full_name,frm.doc.sender,frappe.datetime.global_date_format(frm.doc.creation),frm.doc.subject,frm.doc.recipients]) + '</p>' +
					last_email_content);
		} 
	}
	setup_autosuggest = function() {
		var me = this;

		function split( val ) {
			return val.split( /,\s*/ );
		}
		function extractLast( term ) {
			return split(term).pop();
		}

		$(this.dialog.fields_dict.recipients.input)
			.bind( "keydown", function(event) {
				if (event.keyCode === $.ui.keyCode.TAB &&
						$(this).data( "autocomplete" ) &&
						$(this).data( "autocomplete" ).menu.active ) {
					event.preventDefault();
				}
			})
			.autocomplete({
				source: function(request, response) {
					return frappe.call({
						method:'frappe.email.get_contact_list',
						args: {
							'select': "email_id",
							'from': "Contact",
							'where': "email_id",
							'txt': extractLast(request.term).value || '%'
						},
						quiet: true,
						callback: function(r) {
							response($.ui.autocomplete.filter(
								r.cl || [], extractLast(request.term)));
						}
					});
				},
				appendTo: this.dialog.$wrapper,
				focus: function() {
					// prevent value inserted on focus
					return false;
				},
				select: function( event, ui ) {
					var terms = split( this.value );
					// remove the current input
					terms.pop();
					// add the selected item
					terms.push( ui.item.value );
					// add placeholder to get the comma-and-space at the end
					terms.push( "" );
					this.value = terms.join( ", " );
					return false;
				}
			});
	}
	setup_last_edited_communication =  function() {
		var me = this;
		this.dialog.onhide = function() {
			if(frm && frm.docname) {
				var last_edited_communication = me.get_last_edited_communication();
				$.extend(last_edited_communication, {
					recipients: me.dialog.get_value("recipients"),
					subject: me.dialog.get_value("subject"),
					content: me.dialog.get_value("content"),
				});
			}
		}

		this.dialog.on_page_show = function() {
			if (frm && frm.docname && !me.txt) {
				var last_edited_communication = me.get_last_edited_communication();
				if(last_edited_communication.content) {
					me.dialog.set_value("subject", last_edited_communication.subject || "");
					me.dialog.set_value("recipients", last_edited_communication.recipients || "");
					me.dialog.set_value("content", last_edited_communication.content || "");
				}
			}
		}

	};
	get_last_edited_communication = function() {
		var key = frm.docname;
		if(this.last_email) {
			key = key + ":" + frm.name;
		}
		if (!frappe.last_edited_communication[frm.doctype]) {
			frappe.last_edited_communication[frm.doctype] = {};
		}

		if(!frappe.last_edited_communication[frm.doctype][key]) {
			frappe.last_edited_communication[frm.doctype][key] = {};
		}

		return frappe.last_edited_communication[frm.doctype][key];
	};
});
/*frappe.ui.form.on("Inbox", "tag", function(frm) {
	if(frm.doc.tag == 'Customer' || frm.doc.tag == 'Supplier') {
		return frappe.call({
			method: "mailbox.mailbox.doctype.inbox.inbox.get_tagging_details",
			args: {
				supplier_or_customer: frm.doc.tag,
				sender:frm.doc.sender				
			},
			callback: function(r) {
				if (r.message){
					if (frm.doc.tag == 'Customer') frm.set_value('customer',r.message[0][0])
					else if (frm.doc.tag == 'Supplier') frm.set_value('supplier',r.message[0][0])
				}
				else{
					frappe.msgprint(__("Please Create {0}",[frm.doc.tag]))
				}
			}
		});
	}
})*/
frappe.ui.form.on("Inbox", "customer", function(frm) {
	if (frm.doc.supplier){
		msgprint('You Can Either Select Customer or Supplier')
		frm.set_value('customer','')
	}
})
frappe.ui.form.on("Inbox", "supplier", function(frm) {
	if (frm.doc.customer){
		msgprint('You Can Either Select Customer or Supplier')
		frm.set_value('supplier','')
	}
})