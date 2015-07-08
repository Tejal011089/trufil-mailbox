{% include 'mailbox/mailbox/doctype/compose/compose.js' %};
{% include 'mailbox/mailbox/doctype/compose/attachments.js' %};
frappe.listview_settings["Inbox"] = {
	onload: function(listview) {
		listview.page.add_menu_item(__("Compose"), function() { 
			new frappe.views.Composer({})
 
		});
	},
	add_fields: ["tag"],
	get_indicator: function(doc) {
		if(doc.tag) {
			return [__("Read"),"green", "doc.tag,!=,''"]
		}
		else {
			return [__("UnRead"),"red", "doc.tag,!=,''"]
		}
	},
	get_composer:function(){
		alert("hiii")
	}
}
