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
			me.search_document();
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

	//Search Document
	search_document:function(){
        this.make_structure()
        this.init_for_change()
        this.render_click_data()
    },
    make_structure: function(){
		this.d = new frappe.ui.Dialog({
		title:frappe._('Document Management System'),
		fields: [

			{fieldtype:'Select', fieldname:'filter_type',options:'\nDoctype\nFilename', label:frappe._('Filter Type'), reqd:true, 
				description: frappe._("Select Filter (DocType or Filename) to start.")},

			{fieldtype:'Link', fieldname:'doc_name',options:'DocType', label:frappe._('DocType Name'),reqd:false },

			{fieldtype:'Data', fieldname:'file_name',label:frappe._('File Name'),reqd:false },

			//{fieldtype:'Link', fieldname:'file_name_new',label:frappe._('File Name'),reqd:false },

			{fieldtype:'Button', fieldname:'search',label:frappe._('Search'),reqd:false },

			{fieldtype:'HTML', fieldname:'styles_name', label:__('Styles'), reqd:false,
                        description: __("")},

            {fieldtype:'HTML', fieldname:'scrolling_name', label:__('scrolling'), reqd:false,
                        description: __("")},
		]
	})
	this.fields=this.d.fields_dict
	$('[data-fieldname=doc_name]').css('display','none')
	$('[data-fieldname=file_name]').css('display','none')
	$('[data-fieldname=search]').css('display','none')

	this.div = $('<div id="myGrid">\
		<table style="background-color: #f9f9f9;height:10px" id="mytable">\
		<tbody></tbody></table></div>').appendTo($(this.fields.styles_name.wrapper))


	$('<div id="listingTable">\
						<input type="button" value="Prev" id="btn_prev">\
						<input type="button" value="Next" id="btn_next">\
						page: <span id="page"></span></div>').appendTo($('#myGrid'))


     this.d.show();

    },

    init_for_change:function(){
		var me=this
		$(this.fields.filter_type.input).change(function(){
		if ($(this).val()=='Doctype'){
			$('[data-fieldname=doc_name]').css('display','block')
			$('[data-fieldname=file_name]').css('display','none')
			
		}
		else{
			$('[data-fieldname=file_name]').css('display','block')
			$('[data-fieldname=doc_name]').css('display','none')
			
		}
		$('[data-fieldname=search]').css('display','block')

		});
	
	},

	render_click_data:function(){
	var me=this

	$(this.fields.search.input).click(function() {
		$("#mytable tr").remove();

		if($(me.fields.filter_type.input).val()=='Doctype'){
			doc_name=$(me.fields.doc_name.input).val()
			file_name=null
		}
		else if($(me.fields.filter_type.input).val()=='Filename'){
			doc_name=null
			file_name=$(me.fields.file_name.input).val()
		}

		frappe.call({

			method: "mailbox.dms.page.dms.dms.get_attached_document_data",
			args: {
				"doc_name": doc_name,
				"file_name":file_name,
			},
				callback: function(r) {
					me.values=r.message
					me.cal_for_btn_prev()
				}

			});

	});


},

cal_for_btn_prev:function(){
	var me= this
	var current_page = 1;
	var records_per_page = 2;
	numPages=Math.ceil(me.values.length/records_per_page)
	console.log(numPages)

	$('<div id="listingTable">\
						<input type="button" value="Prev" id="btn_prev">\
						<input type="button" value="Next" id="btn_next">\
						page: <span id="page"></span></div>').appendTo($('#myGrid'))
					

    changePage(1,numPages,me.values,records_per_page);
  	

	$('#btn_prev').click(function(){
		if (current_page > 1) {
        	current_page--;
       		changePage(current_page,numPages,me.values,records_per_page);
    }

    })

    $('#btn_next').click(function(){
    	if (current_page < numPages) {
       	 	current_page++;
        	changePage(current_page,numPages,me.values,records_per_page);
    }

    })
},


});

function changePage(page,numPages,values,records_per_page)
{
    var btn_next = document.getElementById("btn_next");
    var btn_prev = document.getElementById("btn_prev");
    var listing_table = document.getElementById("listingTable");
    var page_span = document.getElementById("page");
 
    // Validate page
    if (page < 1) page = 1;
    if (page > numPages) page = numPages;

    listing_table.innerHTML = "";

    for (var i = (page-1) * records_per_page; i < (page * records_per_page); i++) {
        listing_table.innerHTML += '<tr  id="row"><td id="img" style="background-color:#FFF">'+values[i].module+ '>' +values[i].attached_to_doctype+ '>' +values[i].attached_to_name+ '>' +'<b><a class="fold" id="demo" data-flag=true target="_blank" href="../files/'+values[i].file_name+'">'+values[i].file_name+' </a></b></td></tr>' + "<br>";
    }
    page_span.innerHTML = page;
    console.log(page_span.innerHTML)

    if (page == 1) {
        btn_prev.style.visibility = "hidden";
    } else {
        btn_prev.style.visibility = "visible";
    }

    if (page == numPages){
        btn_next.style.visibility = "hidden";
    } else {
        btn_next.style.visibility = "visible";
    }
}





