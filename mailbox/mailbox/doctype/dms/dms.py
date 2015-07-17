# -*- coding: utf-8 -*-
# Copyright (c) 2015, New Indictrans Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import cint
from frappe import _

class DMS(Document):
	def autoname(self):
		if cint(self.is_group) and not self.doctype_name:
			frappe.throw(_("Please Select Doctype"))
		
		elif cint(self.is_group) and self.doctype_name:
			self.folder_name = self.doctype_name
			self.name = self.folder_name
		
		if cint(self.is_single) and not self.folder_name:
			frappe.throw(_("Please Enter Folder Name"))
		
		elif cint(self.is_single) and self.folder_name:	
			self.name = self.folder_name


	def on_update(self):
		self.parent_module = frappe.db.get_value("Doctype",
			self.doctype_name,"module")

	def validate(self):
		if cint(self.is_group) and not self.doctype_name:
			frappe.throw(_("Please Select Doctype").format(self.email_id))
		


@frappe.whitelist()
def get_module(doctype=None):
	if doctype:
		return frappe.db.get_value("DocType",{"name":doctype},"module")
		
