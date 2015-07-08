frappe.listview_settings["Inbox"] = {
	onload: function(listview) {
		listview.page.add_menu_item(__("Compose"), function() { listview.get_composer() });
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
