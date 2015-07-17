frappe.ui.form.on("DMS","doctype_name", function(frm) {
	frm.set_value("parent_module",'')
	if (frm.doc.doctype_name){
		frappe.call({
			method:"mailbox.mailbox.doctype.dms.dms.get_module",
			args:{"doctype":frm.doc.doctype_name},
			callback: function(r) {
				if (r.message){
					frm.set_value("parent_module",r.message)
					refresh_field("parent_module")
				}
				
			}
		});
		
	}
});
frappe.ui.form.on("DMS","is_single", function(frm) {
	if (frm.doc.is_single){
		frm.set_value("is_group",0)
		refresh_field("is_group")
	}
});
frappe.ui.form.on("DMS","is_group", function(frm) {
	if (frm.doc.is_group){
		frm.set_value("is_single",0)
		refresh_field("is_single")
	}
});
