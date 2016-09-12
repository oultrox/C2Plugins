﻿function GetPluginSettings()
{
	return {
		"name":			"Waker",
		"id":			"Rex_Waker",
		"version":		"0.1",        
		"description":	"Running ticks during suspended status.",
		"author":		"Rex.Rainbow",
		"help url":		"http://c2rexplugins.weebly.com/rex_waker.html",
		"category":		"Rex - Logic",
		"type":			"object",			// not in layout
		"rotatable":	false,
		"dependency":	"waker.js",
		"flags":		pf_singleglobal
	};
};

//////////////////////////////////////////////////////////////
// Conditions
AddCondition(1, 0, "Is awake", "Awake", 
            "Is awake",
            "Return true if in awake running.", "IsAwake");  
//////////////////////////////////////////////////////////////
// Actions
AddComboParamOption("No");
AddComboParamOption("Yes");
AddComboParam("Enable ", "Enable this feature.", 0);
AddAction(1, 0, "Set enable", "Configure", 
          "Set enable to <i>{0}</i>", 
          "Set enable.", "SetEnable");
AddNumberParam("Frame rate", "Frame rate.", 60);
AddAction(2, 0, "Set frame rate", "Configure", 
          "Set frame rate to <i>{0}</i>", 
          "Set frame rate.", "SetFrameRate");  
          
//////////////////////////////////////////////////////////////
// Expressions


ACESDone();

// Property grid properties for this plugin
var property_list = [
    new cr.Property(ept_integer, "Frame rate", 60, "Frame rate per second of while suspended."),
    new cr.Property(ept_combo, "Enable", "Yes", "Enable the waker at layout start.", "No|Yes")    
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
    if (this.properties["Frame rate"] < 0)
    {
        this.properties["Frame rate"] = 0;        
    }
    else if (this.properties["Frame rate"] > 1000)
    {
        this.properties["Frame rate"] = 1000;        
    }
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
