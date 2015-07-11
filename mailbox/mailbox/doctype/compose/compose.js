frappe.provide("mailbox")

mailbox.Composer = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.default_available = ''
		this.validate_default()
		this.ref_no = Math.floor(Date.now() / 1000)
	},
	validate_default:function(){
		var me = this
		frappe.call({
			method:"mailbox.mailbox.doctype.compose.compose.validate",
			callback: function(r) {
				this.default_available = r.message.default
				if (this.default_available){
					me.make();	
				}
				else{
					frappe.msgprint("Please Setup Default Account for Sending Mails(GOTO : Mailbox > Email Config)")
					return 		
				}
			}
		});
	},
	make: function() {
		var me = this;
		this.dialog = new frappe.ui.Dialog({
			title: __("Compose"),
			no_submit_on_enter: true,
			fields: [
				{label:__("To"), fieldtype:"Data", reqd: 1, fieldname:"recipients"},

				{fieldtype: "Section Break"},
				{fieldtype: "Column Break"},
				{label:__("Subject"), fieldtype:"Data", reqd: 1,
					fieldname:"subject"},
				{fieldtype: "Column Break"},
				
				{fieldtype: "Section Break"},
				{label:__("Message"), fieldtype:"Text Editor", reqd: 1,
					fieldname:"content"},

				{fieldtype: "Section Break"},
				{fieldtype: "Column Break"},
				{label:__("Send As Email"), fieldtype:"Check",
					fieldname:"send_email"},
					
				{fieldtype: "Column Break"},
				{label:__("Select Attachments"), fieldtype:"HTML",
					fieldname:"select_attachments"}
				
			],
			primary_action_label: "Send",
			primary_action: function() {
				me.send_action();
			}
		});

		this.prepare();
		this.dialog.show();
		var me = this;
		var fields = this.dialog.fields_dict;
		var attach = $(fields.select_attachments.wrapper);

		$('<ul class="list-unstyled sidebar-menu form-attachments">\
			<li class="divider"></li> <li class="h6 attachments-label">Attachments</li>\
			<li class="divider"></li> <li><a class="strong add-attachment">Attach File \
			<i class="octicon octicon-plus" style="margin-left: 2px;"></i></a></li></ul>').appendTo(attach)

		this.attachments = new frappe.ui.form.Attachment({
			parent : attach,
			frm : this.dialog,
			ref_no : me.ref_no
		});

	},
	prepare: function() {
		var me = this;
		//this.setup_autosuggest();
		$(this.dialog.fields_dict.recipients.input).val(this.recipients || "").change();
		$(this.dialog.fields_dict.subject.input).val(this.subject || "").change();
	},
	send_action: function() {
		var me = this,
		form_values = me.dialog.get_values(),
		btn = me.dialog.get_primary_btn();
		if(!form_values) return;
		me.send_email(btn, form_values);
		//}
	},
	send_email: function(btn, form_values, selected_attachments, print_html, print_format) {
		var me = this;
		return frappe.call({
			method:"mailbox.mailbox.doctype.compose.compose.make",
			args: {
				recipients: form_values.recipients,
				subject: form_values.subject,
				content: form_values.content,
				send_email: form_values.send_email,
				ref_no:this.ref_no
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if (!r.message.not_valid){
						if(form_values.send_email && r.message["recipients"])
							msgprint(__("Email sent to {0}", [r.message["recipients"]]));
						me.dialog.hide();
					}
					else{
						msgprint(__("Recipients Not Valid"));	
					}	
				} else {
					msgprint(__("There were errors while sending email. Please try again."));
				}
			}
		});
	}
});
