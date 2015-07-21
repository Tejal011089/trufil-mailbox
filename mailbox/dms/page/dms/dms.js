
frappe.pages['dms'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'DMS',
		single_column: true
	});

	wrapper.page.set_secondary_action(__('Refresh'), function() {
		wrapper.make_tree();
	});

	wrapper.make_tree = function() {
		var ctype = frappe.get_route()[1] || 'DMS';
		return frappe.call({
			method: 'mailbox.dms.page.dms.dms.get_children',
			args: {ctype: ctype},
			callback: function(r) {
				var root = 'DMS';
				dms = new DMS(ctype, root, page,
					page.main.css({
						"min-height": "300px",
						"padding-bottom": "25px"
					}));
			}
		});
	}
	wrapper.make_tree();
}
frappe.pages['dms'].on_page_show = function(wrapper){
	// set route
	var ctype = frappe.get_route()[1] || 'DMS';

	wrapper.page.set_title(__('{0} Tree',[__(ctype)]));

	/*if(erpnext.sales_chart && erpnext.sales_chart.ctype != ctype) {
		wrapper.make_tree();
	}*/

	//frappe.breadcrumbs.add(frappe.breadcrumbs.last_module || "Selling");
};
DMS = Class.extend({
	init: function(ctype, root, page, parent) {
		$(parent).empty();
		var me = this;
		me.ctype = ctype;
		me.page = page;
		me.can_read = frappe.model.can_read(this.ctype);
		me.can_create = frappe.boot.user.can_create.indexOf(this.ctype) !== -1 ||
					frappe.boot.user.in_create.indexOf(this.ctype) !== -1;
		me.can_write = frappe.model.can_write(this.ctype);
		me.can_delete = frappe.model.can_delete(this.ctype);
        
		me.page.set_primary_action(__("Search"), function() {
			frappe.require("assets/dms/search_document.js")
			new Search_Document({})
		});

		this.tree = new frappe.ui.Tree({
			parent: $(parent),
			label: __(root),
			args: {ctype: ctype},
			method: 'mailbox.dms.page.dms.dms.get_children',
			toolbar: [
				{toggle_btn: true},
				{
					label:__("Add Doctype"),
					condition: function(node) {
						return !node.root && node.data.type == 'module';
					},
					click: function(node) {
						frappe.set_route("List","DMS");
					}
				},
				{
					label:__("Add Child"),
					condition: function(node) { return node.data.type == 'single' },
					click: function(node) {
						me.new_node();
					}
				},
				{
					label:__("Add New Document"),
					condition: function(node) { return node.data.type == 'single' || node.data.type == 'doc'},
					click: function(node) {
						
					}
				}
			]
		});
	},
	new_node: function() {
		var me = this;
		var node = me.tree.get_selected_node();

		if(!(node && node.expandable)) {
			frappe.msgprint(__("Select a group node first."));
			return;
		}

		var fields = [
			{fieldtype:'Data', fieldname: 'name_field',
				label:__('New {0} Name',[__(me.ctype)]), reqd:true},
			{fieldtype:'Select', fieldname:'is_group', label:__('Group Node'), options:'No\nYes',
				description: __("Further nodes can be only created under 'Group' type nodes")}
		]

		if(me.ctype == "Sales Person") {
			fields.splice(-1, 0, {fieldtype:'Link', fieldname:'employee', label:__('Employee'),
				options:'Employee', description: __("Please enter Employee Id of this sales person")});
		}

		// the dialog
		var d = new frappe.ui.Dialog({
			title: __('New {0}',[__(me.ctype)]),
			fields: fields
		})

		d.set_value("is_group", "No");
		// create
		d.set_primary_action(__("Create New"), function() {
			var btn = this;
			var v = d.get_values();
			if(!v) return;

			var node = me.tree.get_selected_node();

			v.parent = node.label;
			v.ctype = me.ctype;

			return frappe.call({
				method: 'erpnext.selling.page.sales_browser.sales_browser.add_node',
				args: v,
				callback: function(r) {
					if(!r.exc) {
						d.hide();
						if(node.expanded) {
							node.toggle_node();
						}
						node.reload();
					}
				}
			});
		});

		d.show();
	},
    
});

