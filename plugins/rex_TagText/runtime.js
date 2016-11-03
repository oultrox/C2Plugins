﻿// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.rex_TagText = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var pluginProto = cr.plugins_.rex_TagText.prototype;

	pluginProto.onCreate = function ()
	{
		// Override the 'set width' action
		pluginProto.acts.SetWidth = function (w)
		{
			if (this.width !== w)
			{
				this.width = w;
				this.set_bbox_changed();			
                
                if (!this.isCanvasSizeLocked)                
				    this.render_text(this.is_force_render);
			}
		};
	};

	/////////////////////////////////////
	// Object type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var typeProto = pluginProto.Type.prototype;

	typeProto.onCreate = function()
	{
	};
	
	typeProto.onLostWebGLContext = function ()
	{
		if (this.is_family)
			return;
			
		var i, len, inst;
		for (i = 0, len = this.instances.length; i < len; i++)
		{
			inst = this.instances[i];
			inst.mycanvas = null;
			inst.myctx = null;
			inst.mytex = null;
		}
	};

	/////////////////////////////////////
	// Instance class
	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;
		
		this.text_changed = true;
	};
	
	var instanceProto = pluginProto.Instance.prototype;

	var requestedWebFonts = {};		// already requested web fonts have an entry here
	
	instanceProto.onCreate = function()
	{
        this.text = "";
		this.set_text(this.properties[0]);	    
		this.visible = (this.properties[1] === 0);		// 0=visible, 1=invisible
		
		// "[bold|italic] 12pt Arial"
		this.font = this.properties[2];
		
		this.color = this.properties[3];
        this.stroke = "none";
		this.halign = this.properties[4];				// 0=left, 1=center, 2=right
		this.valign = this.properties[5];				// 0=top, 1=center, 2=bottom
        
        this.textShadow = "";
		
		this.wrapbyword = (this.properties[7] === 0);	// 0=word, 1=character
		this.lastwidth = this.width;
		this.lastwrapwidth = this.width;
		this.lastheight = this.height;
		
		this.line_height_offset = this.properties[8];
        this.baseLine_mode = this.properties[9];
		this.vshift = this.properties[10] * this.runtime.devicePixelRatio;
		this.is_force_render = (this.properties[11] === 1);
        this.LockCanvasSize( (this.properties[12] === 1), this.width, this.height);           
		
		// Get the font height in pixels.
		// Look for token ending "NNpt" in font string (e.g. "bold 12pt Arial").
		this.facename = "";
		this.fontstyle = "";
		this.ptSize = 0;
		this.textWidth = 0;
		this.textHeight = 0;
		
		this.parseFont();
		
		// For WebGL rendering
		this.mycanvas = null;
		this.myctx = null;
		this.mytex = null;
		this.need_text_redraw = false;
		this.last_render_tick = this.runtime.tickcount;
		
		if (this.recycled)
			this.rcTex.set(0, 0, 1, 1);
		else
			this.rcTex = new cr.rect(0, 0, 1, 1);
			
		// In WebGL renderer tick this text object to release memory if not rendered any more
		if (this.runtime.glwrap)
			this.runtime.tickMe(this);
		
		assert2(this.pxHeight, "Could not determine font text height");
		
        this._tag = null;
        if (!this.recycled)
        {
		    this.canvas_text = new CanvasText();
        }
        this.canvas_text.Reset(this);
        this.canvas_text.textBaseline = (this.baseLine_mode === 0)? "alphabetic":"top";
		//this.lines = this.canvas_text.getLines();
		
		
		// render text at object initialize
		if (this.text)
		    this.render_text(this.is_force_render);		
	};
	
	instanceProto.parseFont = function ()
	{
		var arr = this.font.split(" ");
		
		var i;
		for (i = 0; i < arr.length; i++)
		{
			// Ends with 'pt'
			if (arr[i].substr(arr[i].length - 2, 2) === "pt")
			{
				this.ptSize = parseInt(arr[i].substr(0, arr[i].length - 2));
				this.pxHeight = Math.ceil((this.ptSize / 72.0) * 96.0) + 4;	// assume 96dpi...
				
				if (i > 0)
					this.fontstyle = arr[i - 1];
				
				// Get the face name. Combine all the remaining tokens in case it's a space
				// separated font e.g. "Comic Sans MS"
				this.facename = arr[i + 1];
				
				for (i = i + 2; i < arr.length; i++)
					this.facename += " " + arr[i];
					
				break;
			}
		}
	};

	instanceProto.saveToJSON = function ()
	{
		return {
			"t": this.text,
			"f": this.font,
			"c": this.color,
			"ha": this.halign,
			"va": this.valign,
			"wr": this.wrapbyword,
			"lho": this.line_height_offset,
			"vs": this.vshift,
			"fn": this.facename,
			"fs": this.fontstyle,
			"ps": this.ptSize,
			"pxh": this.pxHeight,
			"tw": this.textWidth,
			"th": this.textHeight,
            "ts": this.textShadow,
			"lrt": this.last_render_tick,
            "bl": this.canvas_text.textBaseline,			
			"txtObj": this.canvas_text.saveToJSON(),
            "isLcs": this.isCanvasSizeLocked,
            "lcw": this.lockedCanvasWidth,
            "lch": this.lockedCanvasHeight,
		};
	};
	
	instanceProto.loadFromJSON = function (o)
	{
		this.text = o["t"];
		this.font = o["f"];
		this.color = o["c"];
		this.halign = o["ha"];
		this.valign = o["va"];
		this.wrapbyword = o["wr"];
		this.line_height_offset = o["lho"];
		this.vshift = o["vs"];
		this.facename = o["fn"];
		this.fontstyle = o["fs"];
		this.ptSize = o["ps"];
		this.pxHeight = o["pxh"];
		this.textWidth = o["tw"];
		this.textHeight = o["th"];
        this.textShadow = o["ts"];
		this.last_render_tick = o["lrt"];
		
		this.text_changed = true;
		this.lastwidth = this.width;
		this.lastwrapwidth = this.width;
		this.lastheight = this.height;

        this.canvas_text.textBaseline = o["bl"];	        
        this.canvas_text.loadFromJSON(o["txtObj"]);
        
        this.isCanvasSizeLocked = o["isLcs"];
        this.lockedCanvasWidth = o["lcw"];
        this.lockedCanvasHeight = o["lch"];
	};
	
	instanceProto.tick = function ()
	{
		// In WebGL renderer, if not rendered for 300 frames (about 5 seconds), assume
		// the object has gone off-screen and won't need its textures any more.
		// This allows us to free its canvas, context and WebGL texture to save memory.
		if (this.runtime.glwrap && this.mytex && (this.runtime.tickcount - this.last_render_tick >= 300))
		{
			// Only do this if on-screen, otherwise static scenes which aren't re-rendering will release
			// text objects that are on-screen.
			var layer = this.layer;
            this.update_bbox();
            var bbox = this.bbox;

            if (bbox.right < layer.viewLeft || bbox.bottom < layer.viewTop || bbox.left > layer.viewRight || bbox.top > layer.viewBottom)
			{
				this.runtime.glwrap.deleteTexture(this.mytex);
				this.mytex = null;
				this.myctx = null;
				this.mycanvas = null;
			}
		}
	};
	
	instanceProto.onDestroy = function ()
	{
		// Remove references to allow GC to collect and save memory
		this.myctx = null;
		this.mycanvas = null;
		
		if (this.runtime.glwrap && this.mytex)
			this.runtime.glwrap.deleteTexture(this.mytex);
		
		this.mytex = null;
	};
	
	instanceProto.updateFont = function ()
	{
		this.font = this.fontstyle + " " + this.ptSize.toString() + "pt " + this.facename;		
		this.render_text(this.is_force_render);
	};

	instanceProto.draw = function(ctx, glmode, is_ignore)
	{
        var isCtxSave = false;
        var width = (this.isCanvasSizeLocked)? this.lockedCanvasWidth : this.width;
        var height = (this.isCanvasSizeLocked)? this.lockedCanvasHeight : this.height;  
    
        ctx.globalAlpha = glmode ? 1 : this.opacity;      
		var myscale = 1;
		
		if (glmode)
		{
			myscale = this.layer.getScale();
            
            if (!isCtxSave)
            {
			    ctx.save();
                isCtxSave = true;
            }
			ctx.scale(myscale, myscale);
		}
		
		// If text has changed, run the word wrap.
		if (this.text_changed || width !== this.lastwrapwidth)
		{
            this.canvas_text.text_changed = true;  // it will update pens (wordwrap) to redraw
			this.text_changed = false;
			this.lastwrapwidth = width;
		}
		
		this.update_bbox();
		var penX = glmode ? 0 : this.bquad.tlx;
		var penY = glmode ? 0 : this.bquad.tly;
		
		if (this.runtime.pixel_rounding)
		{
			penX = (penX + 0.5) | 0;
			penY = (penY + 0.5) | 0;
		}
		
        if (!glmode)
        {
            var isResized = (width !== this.width) || (height !== this.height);
            var isRotated = (this.angle !== 0 );
            if ( isRotated || isResized )
            {
                if (!isCtxSave)
                {
		    	    ctx.save();
                    isCtxSave = true;
                } 
                
                if (isResized)
                {
                    var scalew = this.width/width;
                    var scaleh = this.height/height;
                    ctx.scale(scalew, scaleh);      
                    ctx.translate(penX/scalew, penY/scaleh);      
		    	    penX = 0;
		    	    penY = 0;                         
                }

                if (isRotated)
                {
                    if ((penX !== 0) || (penY !== 0))
		    	        ctx.translate(penX, penY);
                    
		    	    ctx.rotate(this.angle);                   
                }                
           
            }
        }

		var line_height = this.pxHeight;
		line_height += (this.line_height_offset * this.runtime.devicePixelRatio);
			
        // configure
        this.canvas_text.canvas = ctx.canvas;
        this.canvas_text.context = ctx;
        // default setting
        this.canvas_text.default_propScope.family = this.facename;
        // this.canvas_text.default_propScope.weight = ??
        this.canvas_text.default_propScope.ptSize = this.ptSize.toString() + "pt";
        this.canvas_text.default_propScope.style = this.fontstyle;
        this.canvas_text.default_propScope.color = this.color;
        this.canvas_text.default_propScope.stroke = this.stroke;
        this.canvas_text.default_propScope.shadow = this.textShadow;        
        this.canvas_text.lineHeight = line_height;

        this.canvas_text.textInfo["text"] = this.text;
        this.canvas_text.textInfo["x"] = penX;
        this.canvas_text.textInfo["y"] = penY;  
        this.canvas_text.textInfo["boxWidth"] = width;
        this.canvas_text.textInfo["boxHeight"] = height;
        this.canvas_text.textInfo["ignore"] = is_ignore;        
        this.canvas_text.drawText();
        

        if (isCtxSave)
            ctx.restore();        

		this.last_render_tick = this.runtime.tickcount;
	};
	
	instanceProto.drawGL = function(glw)
	{
		if (this.width < 1 || this.height < 1)
			return;
		
		var need_redraw = this.text_changed || this.need_text_redraw;
		this.need_text_redraw = false;
		var layer_scale = this.layer.getScale();
		var layer_angle = this.layer.getAngle();
		var rcTex = this.rcTex;
		
		// Calculate size taking in to account scale
		var floatscaledwidth = layer_scale * this.width;
		var floatscaledheight = layer_scale * this.height;
		var scaledwidth = Math.ceil(floatscaledwidth);
		var scaledheight = Math.ceil(floatscaledheight);
		
		var halfw = this.runtime.draw_width / 2;
		var halfh = this.runtime.draw_height / 2;
        
        // canvas size  
        var canvaswidth = (!this.isCanvasSizeLocked)? scaledwidth : Math.ceil(layer_scale * this.lockedCanvasWidth);
		var canvasheight = (!this.isCanvasSizeLocked)? scaledheight: Math.ceil(layer_scale * this.lockedCanvasHeight);         
		
		// Create 2D context for this instance if not already
		if (!this.myctx)
		{
			this.mycanvas = document.createElement("canvas");
			this.mycanvas.width = canvaswidth;
			this.mycanvas.height = canvasheight;
			this.lastwidth = canvaswidth;
			this.lastheight = canvasheight;
			need_redraw = true;
			this.myctx = this.mycanvas.getContext("2d");
		}
		
		// Update size if changed
		if (canvaswidth !== this.lastwidth || canvasheight !== this.lastheight)
		{
			this.mycanvas.width = canvaswidth;
			this.mycanvas.height = canvasheight;
			
			if (this.mytex)
			{
				glw.deleteTexture(this.mytex);
				this.mytex = null;
			}
			
			need_redraw = true;
		}
		
		// Need to update the GL texture
		if (need_redraw)
		{
			// Draw to my context
			this.myctx.clearRect(0, 0, canvaswidth, canvasheight);
			this.draw(this.myctx, true);
			
			// Create GL texture if none exists
			// Create 16-bit textures (RGBA4) on mobile to reduce memory usage - quality impact on desktop
			// was almost imperceptible
			if (!this.mytex)
				this.mytex = glw.createEmptyTexture(scaledwidth, scaledheight, this.runtime.linearSampling, this.runtime.isMobile);
				
			// Copy context to GL texture
			glw.videoToTexture(this.mycanvas, this.mytex, this.runtime.isMobile);
		}
		
		this.lastwidth = canvaswidth;
		this.lastheight = canvasheight;
		
		// Draw GL texture
		glw.setTexture(this.mytex);
		glw.setOpacity(this.opacity);
		
		glw.resetModelView();
		glw.translate(-halfw, -halfh);
		glw.updateModelView();
		
		var q = this.bquad;
		
		var tlx = this.layer.layerToCanvas(q.tlx, q.tly, true, true);
		var tly = this.layer.layerToCanvas(q.tlx, q.tly, false, true);
		var trx = this.layer.layerToCanvas(q.trx, q.try_, true, true);
		var try_ = this.layer.layerToCanvas(q.trx, q.try_, false, true);
		var brx = this.layer.layerToCanvas(q.brx, q.bry, true, true);
		var bry = this.layer.layerToCanvas(q.brx, q.bry, false, true);
		var blx = this.layer.layerToCanvas(q.blx, q.bly, true, true);
		var bly = this.layer.layerToCanvas(q.blx, q.bly, false, true);
		
		if (this.runtime.pixel_rounding || (this.angle === 0 && layer_angle === 0))
		{
			var ox = ((tlx + 0.5) | 0) - tlx;
			var oy = ((tly + 0.5) | 0) - tly
			
			tlx += ox;
			tly += oy;
			trx += ox;
			try_ += oy;
			brx += ox;
			bry += oy;
			blx += ox;
			bly += oy;
		}
		
		if (this.angle === 0 && layer_angle === 0)
		{
			trx = tlx + scaledwidth;
			try_ = tly;
			brx = trx;
			bry = tly + scaledheight;
			blx = tlx;
			bly = bry;
			rcTex.right = 1;
			rcTex.bottom = 1;
		}
		else
		{
			rcTex.right = floatscaledwidth / scaledwidth;
			rcTex.bottom = floatscaledheight / scaledheight;
		}
		
		glw.quadTex(tlx, tly, trx, try_, brx, bry, blx, bly, rcTex);
		
		glw.resetModelView();
		glw.scale(layer_scale, layer_scale);
		glw.rotateZ(-this.layer.getAngle());
		glw.translate((this.layer.viewLeft + this.layer.viewRight) / -2, (this.layer.viewTop + this.layer.viewBottom) / -2);
		glw.updateModelView();
		
		this.last_render_tick = this.runtime.tickcount;
	};
	
	
	// copy from rex_text_scrolling
    instanceProto._get_webgl_ctx = function ()
	{
        var inst = this;            
        var ctx = inst.myctx;
		if (!ctx)
		{
			inst.mycanvas = document.createElement("canvas");
            var scaledwidth = Math.ceil(inst.layer.getScale()*inst.width);
            var scaledheight = Math.ceil(inst.layer.getAngle()*inst.height);
			inst.mycanvas.width = scaledwidth;
			inst.mycanvas.height = scaledheight;
			inst.lastwidth = scaledwidth;
			inst.lastheight = scaledheight;
			inst.myctx = inst.mycanvas.getContext("2d");
            ctx = inst.myctx;
		}
        return ctx;
	};
	
    instanceProto.fake_render = function ()
	{
        var inst = this;  
        var ctx = (this.runtime.enableWebGL)? 
                  this._get_webgl_ctx():this.runtime.ctx;
        inst.draw(ctx, null, true);
    };
    
	instanceProto.render_text = function (is_render_now)
    {
        if (is_render_now)
        {
            this.text_changed = true;  
            this.fake_render();
        }
        
        this.text_changed = true;               
        this.runtime.redraw = true;
	};    
    
    instanceProto.set_text = function (txt)
	{
        txt = txt.replace(/<\s*br\s*\/>/g, "\n");  // replace "<br />" to "\n"
		if (this.text !== txt)
		{
			this.text = txt;			
			this.render_text(this.is_force_render);
		}
    };  
    
	instanceProto.LockCanvasSize = function(isLocked, width, height)
	{
        this.isCanvasSizeLocked = isLocked;
        this.lockedCanvasWidth = width;
        this.lockedCanvasHeight = height;         
	};           
    
    var copy_dict = function (in_obj, out_obj, is_merge)
    {
        if (out_obj == null)
            out_obj = {};
        
        if (!is_merge)
        {
            for (var k in out_obj)
            {
                if (!in_obj.hasOwnProperty(k))
                    delete out_obj[k];
            }
        }

        for (var k in in_obj)
            out_obj[k] = in_obj[k];

        return out_obj;
    };
    
	/**BEGIN-PREVIEWONLY**/
	instanceProto.getDebuggerValues = function (propsections)
	{
		propsections.push({
			"title": this.type.name,
			"properties": [
				{"name": "Text", "value": this.text},
				{"name": "Font", "value": this.font},
				{"name": "Line height", "value": this.line_height_offset},
				{"name": "Baseline", "value": this.canvas_text.textBaseline},
			]
		});
	};
	
	instanceProto.onDebugValueEdited = function (header, name, value)
	{
		if (name === "Text")
			this.text = value;
		else if (name === "Font")
		{
			this.font = value;
			this.parseFont();
		}
		else if (name === "Line height")
			this.line_height_offset = value;
		
		this.text_changed = true;
			
	};
	/**END-PREVIEWONLY**/
	
	// export
	instanceProto.getRawText = function (text)
	{
		return this.canvas_text.getRawText(text);
	};    
	instanceProto.getSubText = function (start, end, text)
	{
		return this.canvas_text.getSubText(start, end, text);
	};
	instanceProto.copyPensMgr = function (pensMgr)
	{
		return this.canvas_text.copyPensMgr(pensMgr);
	};	
	//////////////////////////////////////
	// Conditions
	function Cnds() {};
	pluginProto.cnds = new Cnds();
    
	Cnds.prototype.CompareText = function(text_to_compare, case_sensitive)
	{
		if (case_sensitive)
			return this.text == text_to_compare;
		else
			return cr.equals_nocase(this.text, text_to_compare);
	};
	Cnds.prototype.DefineClass = function(name)
	{
		this._tag = {};
        
        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
		
        if (solModifierAfterCnds)
            this.runtime.pushCopySol(current_event.solModifiers);
        
        current_event.retrigger();
        
        if (solModifierAfterCnds)
            this.runtime.popSol(current_event.solModifiers);
            
		this.canvas_text.defineClass(name, this._tag);        
		this._tag = null;        
		return false;
	};	
	
	//////////////////////////////////////
	// Actions
	function Acts() {};
	pluginProto.acts = new Acts();
    
    
	Acts.prototype.SetText = function(param)
	{
		if (cr.is_number(param) && param < 1e9)
			param = Math.round(param * 1e10) / 1e10;	// round to nearest ten billionth - hides floating point errors
		
		var text_to_set = param.toString();
        this.set_text(text_to_set);
	};
	
	Acts.prototype.AppendText = function(param)
	{
		if (cr.is_number(param))
			param = Math.round(param * 1e10) / 1e10;	// round to nearest ten billionth - hides floating point errors
			
		var text_to_append = param.toString();
		if (text_to_append.length > 0)	// not empty
            this.set_text(this.text+text_to_append);
	};
	
	Acts.prototype.SetFontFace = function (face_, style_)
	{
		var newstyle = "";
		
		switch (style_) {
		case 1: newstyle = "bold"; break;
		case 2: newstyle = "italic"; break;
		case 3: newstyle = "bold italic"; break;
		}
		    	    
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["font-family"] = face_;
	        this._tag["font-style"] = newstyle;
            this.render_text(false);
	    }
	    else    // global
	    {
	            	    
		    if (face_ === this.facename && newstyle === this.fontstyle)
		    	return;		// no change
		    	
		    this.facename = face_;
		    this.fontstyle = newstyle;
		    this.updateFont();
	    }
	};
	
	Acts.prototype.SetFontSize = function (size_)
	{	    
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["font-size"] = size_.toString() + "pt";
            this.render_text(false);
	    }
	    else    // global
	    {
		    if (this.ptSize === size_)
		    	return;
            
		    this.ptSize = size_;
		    this.pxHeight = Math.ceil((this.ptSize / 72.0) * 96.0) + 4;	// assume 96dpi...
		    this.updateFont();
	   }
	};
	
	Acts.prototype.SetFontColor = function (rgb)
	{        
	    var newcolor;
        if (typeof(rgb) == "number")        
            newcolor = "rgb(" + cr.GetRValue(rgb).toString() + "," + cr.GetGValue(rgb).toString() + "," + cr.GetBValue(rgb).toString() + ")";        
        else
            newcolor = rgb;
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["color"] = newcolor;
            this.render_text(false);
	    }
	    else    // global
	    {    		    	        	        
		    if (newcolor === this.color)
		        return;
		    
		    this.color = newcolor;
		    this.render_text(this.is_force_render);
		    
		}
	};
	
	Acts.prototype.SetWebFont = function (familyname_, cssurl_)
	{
		if (this.runtime.isDomFree)
		{
			cr.logexport("[Construct 2] TagText plugin: 'Set web font' not supported on this platform - the action has been ignored");
			return;		// DC todo
		}
		
		var self = this;
		var refreshFunc = (function () {
							self.runtime.redraw = true;
							self.text_changed = true;
						});
        var newfacename = "'" + familyname_ + "'";
        
		// Already requested this web font?
		if (requestedWebFonts.hasOwnProperty(cssurl_))
		{
            
	        if (this._tag != null)  // <class> ... </class>
	        {
	            this._tag["font-family"] = newfacename;
                this.render_text(false);                
	        }
	        else    // global
	        {
        
			    // Use it immediately without requesting again.  Whichever object
			    // made the original request will refresh the canvas when it finishes
			    // loading.
			    
			    if (this.facename === newfacename)
				    return;	// no change
				
			    this.facename = newfacename;
			    this.updateFont();
			
            }
            
            // There doesn't seem to be a good way to test if the font has loaded,
			// so just fire a refresh every 100ms for the first 1 second, then
			// every 1 second after that up to 10 sec - hopefully will have loaded by then!
			for (var i = 1; i < 10; i++)
			{
				setTimeout(refreshFunc, i * 100);
				setTimeout(refreshFunc, i * 1000);
			}
            
			return;            
		}
		
		// Otherwise start loading the web font now
		var wf = document.createElement("link");
		wf.href = cssurl_;
		wf.rel = "stylesheet";
		wf.type = "text/css";
		wf.onload = refreshFunc;
					
		document.getElementsByTagName('head')[0].appendChild(wf);
		requestedWebFonts[cssurl_] = true;
		
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["font-family"] = newfacename;  
            this.render_text(false);            
	    }
        else
        {        
		    this.facename = "'" + familyname_ + "'";
		    this.updateFont();		
		}
        
        // Another refresh hack
		for (var i = 1; i < 10; i++)
		{
			setTimeout(refreshFunc, i * 100);
			setTimeout(refreshFunc, i * 1000);
		} 
        
		log("Requesting web font '" + cssurl_ + "'... (tick " + this.runtime.tickcount.toString() + ")");
	};
	
	Acts.prototype.SetEffect = function (effect)
	{
		this.compositeOp = cr.effectToCompositeOp(effect);
		cr.setGLBlend(this, effect, this.runtime.gl);
		
		this.render_text(this.is_force_render);
	};
	
	Acts.prototype.SetFontStyle = function (style_)
	{
		var newstyle = "";
		
		switch (style_) {
		case 1: newstyle = "bold"; break;
		case 2: newstyle = "italic"; break;
		case 3: newstyle = "bold italic"; break;
		}
		    	    
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["font-style"] = newstyle;	
            this.render_text(false);            
	    }
	    else    // global
	    {
	            	    
		    if (newstyle === this.fontstyle)
		    	return;		// no change
		    	
		    this.fontstyle = newstyle;
		    this.updateFont();
	    }
	};
	
	Acts.prototype.SetFontFace2 = function (face_)
	{    
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["font-family"] = face_;
            this.render_text(false);                       
	    }
	    else    // global
	    {
	            	    
		    if (face_ === this.facename)
		    	return;		// no change
		    	
		    this.facename = face_;
		    this.updateFont();
	    }
	};	
    
	Acts.prototype.SetLineHeight = function(line_height_offset)
	{
	    if (this.line_height_offset === line_height_offset)
	        return;
	    
	    this.line_height_offset = line_height_offset;
	    this.render_text(this.is_force_render);	                
	};	

	Acts.prototype.SetHorizontalAlignment = function(align)
	{
	    if (this.halign === align)
	        return;
	    
	    this.halign = align;   // 0=left, 1=center, 2=right
	    this.render_text(this.is_force_render);
	    	    
	};

	Acts.prototype.SetVerticalAlignment = function(align)
	{
	    if (this.valign === align)
	        return;
	    
	    this.valign = align;   // 0=top, 1=center, 2=bottom
	    this.render_text(this.is_force_render);
	    	      
	};	

	Acts.prototype.SetWrapping = function(wrap_mode)
	{
	    wrap_mode = (wrap_mode === 0);  // 0=word, 1=character
	    if (this.wrapbyword === wrap_mode)
	        return;
	    
	    this.wrapbyword = wrap_mode;   
	    this.render_text(this.is_force_render);	    	            
	};
	
	
	Acts.prototype.SetCustomProperty = function (name_, value_)
	{    
	    if (!this._tag)
		    return;
			
	    // <class> ... </class>
		this._tag[name_] = value_;	
	};
    
	Acts.prototype.SetShadow = function(offsetX, offsetY, blur_, color_)
	{
        color_ = color_.replace(/ /g,'');
        
        // 2px 2px 2px #000        
        var shadow = offsetX.toString() + "px " + offsetY.toString() + "px " + blur_.toString() + "px " + color_;
	    if (this._tag != null)  // <class> ... </class>
	    {
            
            this._tag["text-shadow"] = shadow	        
            this.render_text(false);                       
	    }
	    else    // global
	    {
	        this.textShadow = shadow;
            this.render_text(this.is_force_render);
	    }              
	};	

	Acts.prototype.AddCSSTags = function (css_)
	{
	    // reference - https://github.com/jotform/css.js
	    var cssRegex = new RegExp('([\\s\\S]*?){([\\s\\S]*?)}', 'gi');	    
	    var commentsRegex;
	    
	    var render_me = false;
	    var arr;
	    var tag_name, comments;
	    var tag, rules, i, cnt, elems, prop_name, prop_value;
	    while (true)
	    {
	        arr = cssRegex.exec(css_);
	        if (arr === null)
	            break;
	        
	        // selector
	        tag_name = arr[1].split('\r\n').join('\n').trim();
	        commentsRegex = new RegExp(this.cssCommentsRegex, 'gi');
            comments = commentsRegex.exec(tag_name);
            if (comments !== null) 
            {
                tag_name = tag_name.replace(commentsRegex, '').trim();
            }
            tag_name = tag_name.replace(/\n+/, "\n");
      	        
      	    // rules
	        tag = {};	        
	        rules = arr[2].split('\r\n').join('\n').split(';');
	        cnt = rules.length;
	        for (i=0; i<cnt ; i++) 
	        {
	            if (rules[i].indexOf(":") === (-1))
	                continue;
	                
	            elems = rules[i].trim().split(':');	    
	            prop_name = elems[0].trim().toLowerCase();
	            prop_value = elems[1].trim();                 
	            tag[ prop_name ] = prop_value;
	        }
	        
	        this.canvas_text.defineClass(tag_name, tag);
	        render_me = true;	        
	    }
	  	 
	  	if (render_me)
	  	    this.render_text(this.is_force_render);  
	};    
    
	Acts.prototype.SetUnderline = function(color_, thinkness, offset)
	{
        color_ = color_.replace(/ /g,'');
        
        // #000 1px 0px
        var underline = color_ + " " + thinkness.toString() + "px " + offset.toString() + "px";
	    if (this._tag != null)  // <class> ... </class>
	    {
            
            this._tag["underline"] = underline;	        
            this.render_text(false);                       
	    }
	    //else    // global
	    //{
        //    this.render_text(this.is_force_render);
	    //}              
	};	    
	
	Acts.prototype.SetStrokeColor = function (rgb)
	{        
	    var newcolor;
        if (typeof(rgb) == "number")        
            newcolor = "rgb(" + cr.GetRValue(rgb).toString() + "," + cr.GetGValue(rgb).toString() + "," + cr.GetBValue(rgb).toString() + ")";        
        else
            newcolor = rgb;
	    if (this._tag != null)  // <class> ... </class>
	    {
	        this._tag["stroke"] = newcolor;
            this.render_text(false);
	    }
	    else    // global
	    {    		    	        	        
		    if (newcolor === this.color)
		        return;
		    
		    this.stroke = newcolor;
		    this.render_text(this.is_force_render);
		    
		}
	};
		
    
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	pluginProto.exps = new Exps();
    
	Exps.prototype.Text = function(ret, start, end)
	{
        var txt;
        if ((start == null) && (end == null))
            txt = this.text;
        else
            txt = this.getSubText(start, end);
		ret.set_string(txt);
	};
	
	Exps.prototype.FaceName = function (ret)
	{
		ret.set_string(this.facename);
	};
	
	Exps.prototype.FaceSize = function (ret)
	{
		ret.set_int(this.ptSize);
	};
	
	Exps.prototype.TextWidth = function (ret)
	{
		ret.set_int(this.canvas_text.getTextWidth());
	};
	
	Exps.prototype.TextHeight = function (ret)
	{
        var total_line_count = this.canvas_text.getLines().length;
	    var text_height = total_line_count * (this.pxHeight + this.line_height_offset) - this.line_height_offset;
	    
	    if (this.baseLine_mode === 0)  // alphabetic
	        text_height += this.vshift;
	        
		ret.set_float(text_height);
	};

	Exps.prototype.RawText = function(ret)
	{
		ret.set_string(this.canvas_text.getRawText());
	};

	Exps.prototype.LastClassPropValue = function(ret, name, default_value)
	{
	    var val;
	    var last_pen = this.canvas_text.getLastPen();	
	    if (last_pen)
	        val = last_pen.prop[name];
	        
	    if (!val)
	        val = default_value || 0;
	        
		ret.set_any(val);
	};	
	

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

// ---------
// object pool class
// ---------
    var ObjCacheKlass = function ()
    {        
        this.lines = [];       
    };
    var ObjCacheKlassProto = ObjCacheKlass.prototype;   
    
	ObjCacheKlassProto.allocLine = function()
	{
		return (this.lines.length > 0)? this.lines.pop(): null;
	};    
	ObjCacheKlassProto.freeLine = function (l)
	{
		this.lines.push(l);
	};	
	ObjCacheKlassProto.freeAllLines= function (arr)
	{
		var i, len;
		for (i = 0, len = arr.length; i < len; i++)
			this.freeLine(arr[i]);
		arr.length = 0;
	};
// ---------
// object pool class
// ---------

    var CanvasText = function ()
    {
        this.canvas = null;
        this.context = null;
        this.savedClasses = {};   // class define
        
        this.textInfo = {
            "text":"",
            "x":0,
            "y":0,
            "boxWidth":0,
            "boxHeight":0,
            "ignore":null,
        };   
        this.pensMgr = new PensMgrKlass();
        this.text_changed = true; // update this.pens to redraw
        
        /*
         * Default values, overwrite before draw by plugin
         */
        this.default_propScope = {
            family:"Verdana",
            weight:"normal",
            ptSize:"12pt",
            color:"#000000",
            stroke:"none",
            style:"normal",            
            shadow:"",
        };
        this.underline = {thickness: 1, offset:0};        
        this.textAlign = "start";
        this.lineHeight = "16";        
        this.textBaseline = "alphabetic";        
    };
    var CanvasTextProto = CanvasText.prototype;

    CanvasTextProto.Reset = function(plugin)
    {
         this.plugin = plugin;
    };
    CanvasTextProto.getLines = function()
    {
        return this.pensMgr.getLines();
    };    

    CanvasTextProto.get_propScope = function (prop_in)
    {
         var propScope = {};

        if (prop_in != null)
        {
            /*
            * Loop the class properties.
             */
            var atribute;
            for (atribute in prop_in) 
            {
                switch (atribute) 
                {
                case "font":
                    propScope["font"] = prop_in[atribute];
                    break;
                
                case "font-family":
                    propScope["family"] = prop_in[atribute];
                    break;
                    
                case "font-weight":
                    propScope["weight"] = prop_in[atribute];
                    break;
                    
                case "font-size":
                    propScope["size"] = prop_in[atribute];
                    break;

                case "color":
                    propScope["color"] = prop_in[atribute];
                    break;            

                case "stroke":
                    propScope["stroke"] = prop_in[atribute];
                    break;                      
                    
                case "font-style":
                    propScope["style"] = prop_in[atribute];
                    break;
                    

                case "text-shadow":
                    propScope["shadow"] = prop_in[atribute];
                    break;     

                case "underline":
                    propScope["underline"] = prop_in[atribute];
                    break;                            
                
                
                // custom property
                default:
                    propScope[atribute] = prop_in[atribute];
                    break;
                }
            }
        }        
       
        return propScope;
    };
    
    CanvasTextProto.apply_propScope = function (propScope)
    {
        var font = propScope["font"];
        if (font)
        {
            this.context.font = font;
        }
        else
        {
            var style = propScope["style"] || this.default_propScope.style;
            var weight = propScope["weight"] || this.default_propScope.weight;
            var ptSize = this.getTextSize(propScope);  
            var family = propScope["family"] || this.default_propScope.family;        
            this.context.font = style + " " + weight + " " + ptSize + " " + family;            
        }
        
        var color = this.getFillColor(propScope);
        var stroke = this.getStokeColor(propScope);

        if (color.toLowerCase() !== "none")
            this.context.fillStyle = color;
        
        if (stroke.toLowerCase() !== "none")
            this.context.strokeStyle = stroke;        
        
        var shadow = propScope["shadow"] || this.default_propScope.shadow;
        if (shadow !== "") 
        {
            shadow = shadow.split(" ");
            this.context.shadowOffsetX = parseFloat(shadow[0].replace("px", ""));
            this.context.shadowOffsetY = parseFloat(shadow[1].replace("px", ""));
            this.context.shadowBlur = parseFloat(shadow[2].replace("px", ""));
            this.context.shadowColor = shadow[3];
        }      
        
    };
    
    CanvasTextProto.getTextSize = function(propScope)
    {
        var size;
        if (propScope.hasOwnProperty("size"))
            size = propScope["size"];
        else
            size = this.default_propScope.ptSize;
        return size;      
    };  
    CanvasTextProto.getFillColor = function(propScope)
    {
        var color;
        if (propScope.hasOwnProperty("color"))
            color = propScope["color"];
        else
            color = this.default_propScope.color;  
        return color;         
    };  
    CanvasTextProto.getStokeColor = function(propScope)
    {
        var color;
        if (propScope.hasOwnProperty("stroke"))
            color = propScope["stroke"];
        else
            color = this.default_propScope.stroke;
        return color;         
    };    
    
    CanvasTextProto.draw_pen = function (pen, offset_x, offset_y)
    {
        this.context.save(); 
        
        this.apply_propScope(pen.prop);   
        
        var startX = offset_x + pen.x;
        var startY = offset_y + pen.y;
        
        // underline
        var underline = pen.prop["underline"];
        if (underline)
        {
            underline = underline.split(" ");
            var color = underline[0];
            
            var thickness_save = this.underline.thickness;
            if (underline[1] != null) this.underline.thickness = parseFloat(underline[1].replace("px", ""));
            
            var offset_save= this.underline.offset;
            if (underline[2] != null) this.underline.offset = parseFloat(underline[2].replace("px", ""));
            
            this.draw_underline(pen.text, startX, startY, 
                                           this.getTextSize(pen.prop), 
                                           color );
                                           
            this.underline.thickness = thickness_save;
            this.underline.offset = offset_save;            
        }
        
        // fill text
        if (this.getFillColor(pen.prop).toLowerCase() !== "none")
            this.context.fillText(pen.text, startX, startY);
        
        // stoke 
        if (this.getStokeColor(pen.prop).toLowerCase() !== "none")
            this.context.strokeText(pen.text, startX, startY);
        
        this.context.restore();
    };
    
    CanvasTextProto.drawPens = function (pensMgr, textInfo)
    {    
        var boxWidth=textInfo["boxWidth"], boxHeight=textInfo["boxHeight"];
        var start_x = textInfo["x"], start_y = textInfo["y"];
        var lines=pensMgr.getLines(), lcnt=lines.length;        
                
        var offset_x, offset_y;
		// vertical alignment
		if (this.plugin.valign === 1)		// center
			offset_y = Math.max( (boxHeight - (lcnt * this.lineHeight)) / 2, 0);
		else if (this.plugin.valign === 2)	// bottom
			offset_y = Math.max(boxHeight - (lcnt * this.lineHeight) - 2, 0);
        else
            offset_y = 0;            
        
        offset_y += start_y;
        
        if (this.textBaseline == "alphabetic")
            offset_y += this.plugin.vshift;  // shift line down    
        
        var li, line_width;
        var pi, pcnt, pens, pen;
        for (li=0; li<lcnt; li++)
        {
            line_width = pensMgr.getLineWidth(li);
            if (line_width === 0)
                continue;
            
			if (this.plugin.halign === 1)		// center
				offset_x = (boxWidth - line_width) / 2;
			else if (this.plugin.halign === 2)	// right
				offset_x = boxWidth - line_width; 
            else
                offset_x = 0;                
            
            offset_x += start_x;
                
            pens = lines[li];
            pcnt = pens.length;           
            for (pi=0; pi<pcnt; pi++)
            {
                pen = pens[pi];  
                if (pen.text === "")
                    continue;

                this.draw_pen(pen, offset_x, offset_y);
            }
        }
    };    

    CanvasTextProto.draw_underline = function (text, x, y, size, color)
    {
        var ctx = this.context;
        var width = ctx.measureText(text).width;
        //switch(ctx.textAlign)
        //{
        //case "center": x -= (width/2); break;
        //case "right": x -= width; break;
        //}
        y += this.underline.offset;        
        if (this.textBaseline === "top")
            y += parseInt(size);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = this.underline.thickness;
        ctx.moveTo(x,y);
        ctx.lineTo(x+width,y);
        ctx.stroke();
    };       
    
    // split text into array
    var __re_class_header = /<\s*class=/i;
    var __re_class = /<\s*class=["|']([^"|']+)["|']\s*\>(.*?)<\s*\/class\s*\>/;
    var __re_style_header = /<\s*style=/i;
    var __re_style = /<\s*style=["|']([^"|']+)["|']\s*\>(.*?)<\s*\/style\s*\>/; 
    
    var RAWTEXTONLY_MODE = 1;   
    var __result=[];
    var split_text = function(txt, mode)
    {
        var re = /<\s*class=["|']([^"|']+)["|']\s*\>(.*?)<\s*\/class\s*\>|<\s*style=["|']([^"|']+)["|']\s*\>(.*?)<\s*\/style\s*\>/g;
        __result.length = 0;
        var arr, m, char_index=0, total_length=txt.length,  match_start=total_length;
        var innerMatch;
        while(true)    
        {
            arr = re.exec(txt);
            if (!arr)
            {               
                break; 
            }

        
            m = arr[0];
            match_start = re["lastIndex"] - m.length;
        
            if (char_index < match_start)
            {
                __result.push(txt.substring(char_index,match_start));
                
            }            
            if (mode == null)                  
            {
                __result.push(m); 
            }
            else if (mode === RAWTEXTONLY_MODE)
            {
                if (__re_class_header.test(m)) 
                {
                    innerMatch = m.match(__re_class);
                    __result.push(innerMatch[2]);
                }
                else if (__re_style_header.test(m)) 
                {
                    innerMatch = m.match(__re_style);               
                    __result.push(innerMatch[2]);                
                }                 
            }
            
            char_index = re["lastIndex"];            
        }
        
    
        if (char_index < total_length)
        {
            __result.push(txt.substring(char_index,total_length));
        }           
        return __result;
    }; 
    // split text into array    

    var _style2prop = function(s)
    {
        s = s.split(";");
        var i, cnt=s.length;
        var result = {}, prop, k, v;
        for (i= 0; i<cnt; i++) 
        {
            prop = s[i].split(":");
			k = prop[0], v = prop[1];
            if (isEmpty(k) || isEmpty(v)) 
            {
                // Wrong property name or value. We jump to the
                // next loop.
                continue;
            }
			
			result[k] = v;
        }
        return result;
    };
 

    CanvasTextProto.updatePens = function (pensMgr, textInfo, ignore_wrap) 
    {
        if (textInfo == null)
            textInfo = this.textInfo;
        
        pensMgr.freePens();
        
        // Save the textInfo into separated vars to work more comfortably.
        var text=textInfo["text"], boxWidth=textInfo["boxWidth"], boxHeight=textInfo["boxHeight"];
        if (text === "")
            return;
        
        //var start_x = textInfo["x"], start_y = textInfo["y"];  
        // textInfo["x"], textInfo["y"] had been moved to drawPens
        
        var start_x = 0, start_y = 0;
		var cursor_x=start_x, cursor_y=start_y;        
		var curr_propScope, proText;
		
		
        // The main regex. Looks for <style>, <class> tags.
        var m, match=split_text(text);
		if (match.length === 0)
		    return;
        var i, match_cnt = match.length;
        var innerMatch = null;

        for (i = 0; i < match_cnt; i++) 
        {
     
            m = match[i];
            // Check if current fragment is a class tag.
            if (__re_class_header.test(m)) 
            { 
                // Looks the attributes and text inside the class tag.
                innerMatch = m.match(__re_class);
                curr_propScope = this.get_propScope(this.getClass(innerMatch[1]));
                curr_propScope["class"] = innerMatch[1];
                proText = innerMatch[2];
            }
            else if (__re_style_header.test(m)) 
            {
                // Looks the attributes and text inside the style tag.
                innerMatch = m.match(__re_style);

                // innerMatch[1] contains the properties of the attribute.               
                curr_propScope = this.get_propScope(_style2prop(innerMatch[1]));                 
                proText = innerMatch[2];
                
            } 
            else 
            {
                // Text without special style.
                proText = m;
                curr_propScope = {};
            }
            

            
            
            if (!ignore_wrap)
            {
                // Save the current context.
                this.context.save();   
            
                this.apply_propScope(curr_propScope);
            
                // wrap text
                var wrap_lines = wordWrap(proText, this.context, boxWidth, this.plugin.wrapbyword, cursor_x-start_x );          
                
                // add pens
                var lcnt=wrap_lines.length, n, wrap_line; 
                for (n=0; n<lcnt; n++) 
                {
                    wrap_line = wrap_lines[n];                       
                    pensMgr.addPen(wrap_line.text,       // text
                                             cursor_x,             // x
                                             cursor_y,             // y
                                            wrap_line.width,      // width
                                            curr_propScope,       // prop
                                            wrap_line.newLineMode // new_line_mode
                                           );
                
                    if (wrap_line.newLineMode !== NO_NEWLINE)
                    {
                        cursor_x = start_x;
                        cursor_y += this.lineHeight;
                    }
                    else
                    {
			    	    cursor_x += wrap_line.width;                    
                    }
                
                }
                this.context.restore();                
            }
            else
            {
                pensMgr.addPen(proText,                   // text
                                         null,                        // x
                                         null,                        // y
                                         null,                        // width
                                         curr_propScope,       // prop
                                         0                            // new_line_mode
                                         );            
                 // new line had been included in raw text
            }
        }  // for (i = 0; i < match_cnt; i++) 
    }; 
    
    CanvasTextProto.drawText = function () 
    {  	
        var textInfo = this.textInfo;
        if (this.text_changed)
        {
            this.updatePens(this.pensMgr, textInfo);
            this.text_changed = false;
        }
		
		if (!textInfo["ignore"])
		{
            // Let's draw the text
            // Set the text Baseline
            this.context.textBaseline = this.textBaseline;
            // Set the text align
            this.context.textAlign = this.textAlign;   
            
            this.drawPens(this.pensMgr, textInfo);
	    }
                
    }; 

    var __tempPensMgr = null;
    CanvasTextProto.getSubText = function (start, end, text)
    {
        if (text == null)
            return this.pensMgr.getSliceTagText(start, end);
        
        if (__tempPensMgr === null)
            __tempPensMgr = new PensMgrKlass();
        
        var text_save = this.textInfo["text"];
        this.textInfo["text"] = text;
        this.updatePens(__tempPensMgr, this.textInfo, true);
        this.textInfo["text"] = text_save;

        return __tempPensMgr.getSliceTagText(start, end);   
    };
    
    CanvasTextProto.getRawText = function (text)
    {
        if (text == null)
            return this.pensMgr.getRawText();
        
        var m, match=split_text(text, RAWTEXTONLY_MODE);
		if (match.length === 0)
		    return "";
        
        var i, match_cnt = match.length;
        var innerMatch, rawTxt ="";
        for (i=0; i<match_cnt; i++) 
        {
            rawTxt += match[i];
        }  // for (i = 0; i < match_cnt; i++)     

        return rawTxt;       
    };
        
    CanvasTextProto.copyPensMgr = function (pensMgr)
    {
        return this.pensMgr.copy(pensMgr);
    }
        
    CanvasTextProto.getTextWidth = function (pensMgr)
    {
        if (pensMgr == null)
            pensMgr = this.pensMgr;
        
        return pensMgr.getMaxLineWidth();
    } ;
        
    CanvasTextProto.getLastPen = function (pensMgr)
    {
        if (pensMgr == null)
            pensMgr = this.pensMgr;
        
        return pensMgr.getLastPen();
    } ;
    
    /**
     * Save a new class definition.
     */
    CanvasTextProto.defineClass = function (id, definition) {
		this.savedClasses[id] = definition;
        return true;
    }; 
    
    /**
     * Returns a saved class.
     */
    CanvasTextProto.getClass = function (id) {
		return this.savedClasses[id];
    };
    
    /**
     * A simple function to check if the given value is empty.
     */
    var isEmpty = function (str) {
        // Remove white spaces.
        str = str.replace(/^\s+|\s+$/, '');
        return str.length == 0;
    };    

    /**
     * A simple function clear whitespaces.
     */
    CanvasTextProto.trim = function (str) {
        var ws, i;
        str = str.replace(/^\s\s*/, '');
        ws = /\s/;
        i = str.length;
        while (ws.test(str.charAt(--i))) {
            continue;
        }
        return str.slice(0, i + 1);
    };       
    
// ----

	CanvasTextProto.saveToJSON = function ()
	{
		return {
			"cls": this.savedClasses,
		};
	};
	
	CanvasTextProto.loadFromJSON = function (o)
	{
		this.savedClasses = o["cls"];
	};    


// ---------
// wrap characters into lines
// ---------	
	var NO_NEWLINE = 0;
	var RAW_NEWLINE = 1;
	var WRAPPED_NEWLINE = 2;
	var lineCache = new ObjCacheKlass();
    lineCache.newline = function(text, width, newLineMode)
	{
	    var l = this.allocLine() || {};
		l.text = text;
		l.width = width;
		l.newLineMode = newLineMode; // 0= no new line, 1=raw "\n", 2=wrapped "\n"
		return l;
	};	

    var __wrapped_lines=[];
	var wordWrap = function (text, ctx, width, wrapbyword, offset_x)
	{	    
        var lines=__wrapped_lines;
        lineCache.freeAllLines(lines);
        
		if (!text || !text.length)
		{
			return lines;
		}
			
		if (width <= 2.0)
		{
			return lines;
		}
		
		// If under 100 characters (i.e. a fairly short string), try a short string optimisation: just measure the text
		// and see if it fits on one line, without going through the tokenise/wrap.
		// Text musn't contain a linebreak!
		if (text.length <= 100 && text.indexOf("\n") === -1)
		{
			var all_width = ctx.measureText(text).width;
			
			if (all_width <= (width - offset_x))
			{
				// fits on one line
				lineCache.freeAllLines(lines);
				lines.push(lineCache.newline(text, all_width, NO_NEWLINE));
				return lines;
			}
		}
			
		return WrapText(text, lines, ctx, width, wrapbyword, offset_x);
	};	
	
	var WrapText = function (text, lines, ctx, width, wrapbyword, offset_x)
	{
		var wordArray = (wrapbyword)?  TokeniseWords(text) : text;
			
		var cur_line = "";
		var prev_line;
		var line_width;
		var i, wcnt=wordArray.length;
		var lineIndex = 0;
		var line;
		
		for (i = 0; i < wcnt; i++)
		{
			// Look for newline
			if (wordArray[i] === "\n")
			{
				// Flush line.  Recycle a line if possible
				if (lineIndex >= lines.length)
					lines.push(lineCache.newline(cur_line, ctx.measureText(cur_line).width, RAW_NEWLINE));
					
				lineIndex++;
				cur_line = "";
				offset_x = 0;
				continue;
			}
			
			// Otherwise add to line
			prev_line = cur_line;
			cur_line += wordArray[i];
			
			// Measure line
			line_width = ctx.measureText(cur_line).width;
			
			// Line too long: wrap the line before this word was added
			if (line_width >= (width - offset_x))
			{
				// Append the last line's width to the string object
				if (lineIndex >= lines.length)
					lines.push(lineCache.newline(prev_line, ctx.measureText(prev_line).width, WRAPPED_NEWLINE));
					
				lineIndex++;
				cur_line = wordArray[i];
				
				// Wrapping by character: avoid lines starting with spaces
				if (!wrapbyword && cur_line === " ")
					cur_line = "";
					
		        offset_x = 0;
			}
		}
		
		// Add any leftover line
		if (cur_line.length)
		{
			if (lineIndex >= lines.length)
				lines.push(lineCache.newline(cur_line, ctx.measureText(cur_line).width, NO_NEWLINE));
					
			lineIndex++;
		}
		
		// truncate lines to the number that were used. recycle any spare line objects
		for (i = lineIndex; i < lines.length; i++)
			lineCache.freeLine(lines[i]);
		
		lines.length = lineIndex;
		return lines;
	};
    
	var __wordsCache = [];
	var TokeniseWords = function (text)
	{
		__wordsCache.length = 0;
		var cur_word = "";
		var ch;
		
		// Loop every char
		var i = 0;
		
		while (i < text.length)
		{
			ch = text.charAt(i);
			
			if (ch === "\n")
			{
				// Dump current word if any
				if (cur_word.length)
				{
					__wordsCache.push(cur_word);
					cur_word = "";
				}
				
				// Add newline word
				__wordsCache.push("\n");
				
				++i;
			}
			// Whitespace or hyphen: swallow rest of whitespace and include in word
			else if (ch === " " || ch === "\t" || ch === "-")
			{
				do {
					cur_word += text.charAt(i);
					i++;
				}
				while (i < text.length && (text.charAt(i) === " " || text.charAt(i) === "\t"));
				
				__wordsCache.push(cur_word);
				cur_word = "";
			}
			else if (i < text.length)
			{
				cur_word += ch;
				i++;
			}
		}
		
		// Append leftover word if any
		if (cur_word.length)
			__wordsCache.push(cur_word);
			
	    return __wordsCache;
	};

	   

// ---------
// wrap characters into lines
// ---------

// ---------
// pens manager
// ---------    
    var __penMgr_penCache = new ObjCacheKlass();
    var __penMgr_lineCache =new ObjCacheKlass();  
    var PensMgrKlass = function ()    
    { 
        this.pens = [];   // all pens
        this.lines= [];   // pens in lines [ [],[],[],.. ]
       
    };
	var PensMgrKlassProto = PensMgrKlass.prototype;    
    
    PensMgrKlassProto.freePens = function ()
    {     
        var li, lcnt=this.lines.length;
        for(li=0; li<lcnt; li++)
            this.lines[li].length = 0;   // unlink pens 
                
        __penMgr_penCache.freeAllLines(this.pens);
        __penMgr_lineCache.freeAllLines(this.lines);         
    };
    
    
    PensMgrKlassProto.addPen = function (txt, x, y, width, prop, new_line_mode)
    {     
        var pen = __penMgr_penCache.allocLine();
        if (pen === null)
        {
            pen = new PenKlass();
        }
        pen.setPen(txt, x, y, width, prop, new_line_mode);

        var prev_pen = this.pens[this.pens.length -1];
        if (prev_pen == null)
            pen.startIndex = 0;
        else
            pen.startIndex = prev_pen.getNextStartIndex();
        this.pens.push(pen);
        
        // maintan lines
        var line = this.lines[this.lines.length-1];
        if (line == null)
        {
            line = __penMgr_lineCache.allocLine() || [];
            this.lines.push(line);            
        }
        line.push(pen);      
         
        // new line, add an empty line
        if (new_line_mode !== NO_NEWLINE)
        {       
            line = __penMgr_lineCache.allocLine() || [];
            this.lines.push(line);   
        }
    };   
    
    PensMgrKlassProto.getPens = function ()
    {     
        return this.pens;
    };
    
    PensMgrKlassProto.getLastPen = function ()
    {     
        return this.pens[this.pens.length -1];
    };    
    
    PensMgrKlassProto.getLines = function ()
    {     
        return this.lines;
    };  
    
    PensMgrKlassProto.getLineStartChartIndex = function (i)
    {
        var line = this.lines[i];
        if (line == null)
            return 0;
        
        return line[0].startIndex;
    };  
        
    PensMgrKlassProto.getLineEndChartIndex = function (i)
    {     
        var li, has_last_pen=false, line;
        for(li=i; li>=0; li--)
        {
            line = this.lines[li];
            has_last_pen = (line != null) && (line.length>0);
            if (has_last_pen)
                break;
        }
        if (!has_last_pen)
            return 0;
        
        var last_pen = line[line.length-1];
        return last_pen.getEndIndex();
    };
    
    PensMgrKlassProto.copy = function (targetPensMgr)
    {     
        if (targetPensMgr == null)
            targetPensMgr = new PensMgrKlass();
        
        targetPensMgr.freePens();
        
        var li, lcnt=this.lines.length;
        var pens, pi, pcnt, pen;
        for (li=0; li<lcnt; li++ )
        {
            pens = this.lines[li];
            pcnt = pens.length;
            
            for (pi=0; pi<pcnt; pi++)
            {
                pen = pens[pi];
                targetPensMgr.addPen(pen.text, 
                                                  pen.x, 
                                                  pen.y, 
                                                  pen.width, 
                                                  pen.prop, 
                                                  pen.newLineMode);
                                                  
            }
        }
        
        return targetPensMgr;
    };      

    PensMgrKlassProto.getLineWidth = function (i)
    {     
        var line = this.lines[i];
        if (!line)
            return 0;

        var last_pen = line[line.length -1];
        if (!last_pen)
            return 0;
        
        var first_pen = line[0];        
        var line_width = last_pen.getLastX();  // start from 0
        return line_width;
    };    
    
    PensMgrKlassProto.getMaxLineWidth = function ()
    {     
        var w, maxW=0, i, cnt=this.lines.length, line, last_pen;
        for (i=0; i<cnt; i++)
        {
            w = this.getLineWidth(i);
            if (w > maxW)
                maxW = w;
        }
        
        return maxW;
    };    

    PensMgrKlassProto.getRawText = function ()
    {
        var txt="", i, cnt=this.pens.length, pen;
        for(i=0; i<cnt; i++)
            txt += this.pens[i].getRawText();        
        
        return txt;
    }; 

    PensMgrKlassProto.getRawTextLength = function ()
    {
        var l=0, i, cnt=this.pens.length, pen;
        for(i=0; i<cnt; i++)        
            l += this.pens[i].getRawText().length;        
        
        return l;
    }; 
    
    PensMgrKlassProto.getSliceTagText = function (start, end)
    {     
        if (start == null)
            start = 0;
        if (end == null)
        {
            var last_pen = this.getLastPen();
            if (last_pen == null)
                return "";
            
            end = last_pen.getEndIndex();
        }

        var txt="", i, cnt=this.pens.length, pen, pen_txt, pen_si, pen_ei, in_range;
        for(i=0; i<cnt; i++)
        {
            pen = this.pens[i];
            pen_txt = pen.getRawText();             
            pen_si = pen.startIndex;
            pen_ei = pen.getNextStartIndex();
            
            if (pen_ei <= start)
                continue;
            
            in_range = (pen_si >= start) && (pen_ei < end);
            if (!in_range)
            {                
                pen_txt = pen_txt.substring(start-pen_si, end-pen_si);
            }
            
            txt += prop2TagText(pen_txt, pen.prop);
            
            if (pen_ei >= end)
                break;           
        }
        
        return txt;
    };  

    var __prop_list=[];
    var prop2TagText = function (txt, prop)
    {
        if (prop["class"])  // class mode
            txt = "<class='" + prop["class"] + "'>" + txt + "</class>";
        else  // style mode
        {
            __prop_list.length = 0;
            for (var k in prop)
            {
                __prop_list.push(k+":"+prop[k]);
            }
            
            if (__prop_list.length > 0)
                txt = "<style='" + __prop_list.join(";") + "'>" + txt + "</style>";
        }
        return txt;
    };
    
    
    var PenKlass = function ()
    {
        this.text = null;
        this.x = null;
        this.y = null;
        this.width = null;
        this.prop = {};
        this.newLineMode = null;
        this.startIndex = null;
    }
	var PenKlassProto = PenKlass.prototype;    
    
    PenKlassProto.setPen = function (txt, x, y, width, prop, new_line_mode, start_index)
    {
        this.text = txt;
        this.x = x;
        this.y = y;
        this.width = width;
        copy_dict(prop, this.prop); // font, size, color, shadow, etc...
        this.newLineMode = new_line_mode;  // 0= no new line, 1=raw "\n", 2=wrapped "\n"
        this.startIndex = start_index;        
    };       
    
    PenKlassProto.getRawText = function ()
    {
        var txt = this.text;
        if (this.newLineMode == RAW_NEWLINE)
            txt += "\n";
        
        return txt;
    }
    PenKlassProto.getNextStartIndex = function()
    {
        return this.startIndex + this.getRawText().length;
    };
    
    PenKlassProto.getEndIndex = function()
    {
        return this.getNextStartIndex() - 1;
    };
    
    PenKlassProto.getLastX = function()
    {
        return this.x + this.width;
    };
// ---------
// pens manager
// ---------        
}());     