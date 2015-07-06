frappe.listview_settings["Inbox"] = {
	add_fields: ["tag"],
	get_indicator: function(doc) {
		if(doc.tag) {
			return [__("Read"),"green", "doc.tag,!=,''"]
		}
		else {
			return [__("UnRead"),"red", "doc.tag,!=,''"]
		}
	}
}
