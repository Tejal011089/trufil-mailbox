frappe.ui.form.on("DMS Configuration", "doctype", function(frm) {
	alert("hsdhghjg")
	if (frm.doc.doctype){
		alert("hii")
		module_name = frappe.model.get_value("Doctype",frm.doc.doctype, "module");
		console.log(module_name)
		frm.set_value('parent_module',module_name)
		frm.refresh_field('parent_module')
	}
})