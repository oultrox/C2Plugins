﻿function GetBehaviorSettings()
{
	return {
		"name":			"Canvas Ext",
		"id":			"Rex_CanvasExt",
		"description":	"Extension of canvas.",
		"author":		"Rex.Rainbow",
		"help url":		"http://c2rexplugins.weebly.com/rex_canvasext.html",
		"category":		"Rex - Canvas helper",
		"flags":		bf_onlyone,
        "dependency":	"zlib_and_gzip.min.js"
	};
};

//////////////////////////////////////////////////////////////
// Conditions
AddCondition(10, cf_trigger, "On image URL loaded", "Web", "On image URL loaded", "Triggered after 'Load image from URL' when the image has finished loading.", "OnURLLoaded");

//////////////////////////////////////////////////////////////
// Actions
AddStringParam("JSON", "A string of the zp data to load.");
AddAction(1, 0, "Load", "Zlib", "Load from JSON string <i>{0}</i>", "Load from a image data previously encoded in zipped JSON format.", "JSONLoad");


AddObjectParam("object", "Object to erase.");
AddAction(4, 0, "Erase object", "Canvas", "Erase Object {0}", "Erase objects.", "EraseObject");

AddStringParam("URI", "Enter the URL on the web, or data URI, of an image to load.", "\"http://\"");
AddComboParamOption("Resize to image size");
AddComboParamOption("Keep current size");
AddComboParamOption("Scale down if larger than canvas");
AddComboParam("Size", "Whether to resize the sprite to the size of the loaded image, or stretch it to the current size.");
AddAction(10, 0, "Load image from URL", "Web", "Load image from <i>{0}</i> ({1})", "Replace the currently displaying animation frame with an image loaded from a web address or data URI.", "LoadURL");

//////////////////////////////////////////////////////////////
// Expressions
AddExpression(1, ef_return_string, "Get image data as JSON", "Zlib", "AsJSON", "Return the image data in JSON format after zip.");

ACESDone();

// Property grid properties for this plugin
var property_list = [ 
	new cr.Property(ept_combo, "Override SL", "No", "Enable if you wish override original saving/loading.", "No|Zlib"),                       
	];
	
// Called by IDE when a new behavior type is to be created
function CreateIDEBehaviorType()
{
	return new IDEBehaviorType();
}

// Class representing a behavior type in the IDE
function IDEBehaviorType()
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
}

// Called by IDE when a new behavior instance of this type is to be created
IDEBehaviorType.prototype.CreateInstance = function(instance)
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
