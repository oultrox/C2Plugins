﻿function GetPluginSettings()
{
	return {
		"name":			"TMX-XML Parser",
		"id":			"Rex_tmx_XML_parser",
		"version":		"0.11",          
		"description":	"A TMX-XML parser.",
		"author":		"Rex.Rainbow",
		"help url":		"http://c2rexplugins.weebly.com/rex_tmx_xml_parser.html",
		"category":		"Rex - Board - tmx importer v2.x",
		"type":			"object",			// not in layout
		"rotatable":	false,
		"flags":		0,
        "dependency":	"zlib_and_gzip.min.js"
	};
};

//////////////////////////////////////////////////////////////
// Conditions
        
//////////////////////////////////////////////////////////////
// Actions 
  
//////////////////////////////////////////////////////////////
// Expressions
              
ACESDone();

// Property grid properties for this plugin
var property_list = [  
	];
	
// Called by IDE when a new object type is to be created
function CreateIDEObjectType()
{
	return new IDEObjectType();
}

// Class representing an object type in the IDE
function IDEObjectType()
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
}

// Called by IDE when a new object instance of this type is to be created
IDEObjectType.prototype.CreateInstance = function(instance)
{
	return new IDEInstance(instance, this);
}

// Class representing an individual instance of an object in the IDE
function IDEInstance(instance, type)
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
	
	// Save the constructor parameters
	this.instance = instance;
	this.type = type;
	
	// Set the default property values from the property table
	this.properties = {};
	
	for (var i = 0; i < property_list.length; i++)
		this.properties[property_list[i].name] = property_list[i].initial_value;
}

// Called by the IDE after all initialization on this instance has been completed
IDEInstance.prototype.OnCreate = function()
{
}

// Called by the IDE after a property has been changed
IDEInstance.prototype.OnPropertyChanged = function(property_name)
{
}
	
// Called by the IDE to draw this instance in the editor
IDEInstance.prototype.Draw = function(renderer)
{
}

// Called by the IDE when the renderer has been released (ie. editor closed)
// All handles to renderer-created resources (fonts, textures etc) must be dropped.
// Don't worry about releasing them - the renderer will free them - just null out references.
IDEInstance.prototype.OnRendererReleased = function()
{
}
