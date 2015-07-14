{% include 'mailbox/mailbox/doctype/compose/compose.js' %};
{% include 'mailbox/mailbox/doctype/compose/attachments.js' %};
frappe.listview_settings["Inbox"] = {
	onload: function(listview) {
		listview.page.add_inner_button(__("Compose"), function() { 
			new mailbox.Composer({})
		});
		listview.page.add_inner_button(__("sync"), function() { 
			frappe.call({
				method:"mailbox.mailbox.doctype.inbox.inbox.sync_for_current_user",
				callback: function(r) {
					msgprint(__("Email Synced, Please Refresh page."))
				}
			});
		});
	},
	refresh: function(listview) {
		listview.page.add_inner_button(__("Compose"), function() { 
			new mailbox.Composer({})
		});
		listview.page.add_inner_button(__("sync"), function() { 
			frappe.call({
				method:"mailbox.mailbox.doctype.inbox.inbox.sync_for_current_user",
				callback: function(r) {
					msgprint(__("Email Synced, Please Refresh page."))	
				}
			});
		});
	},
	add_fields: ["tag"],
	get_indicator: function(doc) {
		if(doc.tag) {
			return [__("Read"),"green", "doc.tag,!=,''"]
		}
		else {
			return [__("Yet to be Read"),"red", "doc.tag,!=,''"]
		}
	}
}
