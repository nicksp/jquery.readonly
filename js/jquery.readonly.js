/**
* @license Readonly plugin for jquery
* http://github.com/RobinHerbots/jquery.readonly
* Copyright (c) 2011 Robin Herbots
* Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
* Version: 0.1.9
*
* -- grayscale function -- Copyright (C) James Padolsey (http://james.padolsey.com)
*/

(function($) {
    $.fn.readonly = function(fn) {
        var _fn, grayscale = $.fn.readonly.grayscale;

        if (typeof fn == "string") {
            _fn = $.fn.readonly[fn];
            if (_fn) {
                var args = $.makeArray(arguments).slice(1);
                return _fn.apply(this, args);
            }
        }
        _fn = $.fn.readonly['_readonly'];
        var args = (fn == null && arguments.length > 1) ? $.makeArray(arguments).slice(1) : arguments;
        return _fn.apply(this, args);
    };

    $.fn.extend($.fn.readonly, {
        defaults: {
            eventTypes: ['blur', 'focus', 'focusin', 'focusout', 'load', 'resize', 'scroll', 'unload', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'change', 'select', 'submit', 'keydown', 'keypress', 'keyup', 'error'],
            grayout: false,
            eventBlockSelector: '*', //defines the element(s) to block the eventTypes on
            disableSelector: ":input, select, a", //defines the element(s) to disable
            excludeValidatorIds: [], //validators to keep untouched by readonly
            readonlyClass: "readonly"
        },
        reset: function(options) {
            function hookupValidator(control, validator) {
                if (control.tagName != "INPUT" && control.tagName != "TEXTAREA" && control.tagName != "SELECT" && control.tagName != "TD") {
                    for (var i = 0; i < control.childNodes.length; i++) {
                        hookupValidator(control.childNodes[i], validator);
                    }
                } else {
                    control.Validators.push(validator);
                }
            }
            var options = $.extend({}, $.fn.readonly.defaults, options);
            return this.each(function() {
                var $elmain = $(this);
                if ($elmain.hasClass(options.readonlyClass) == true) {
                    //unmark the main object
                    $elmain.removeClass(options.readonlyClass);
                    $elmain.find(options.eventBlockSelector).andSelf().unbind(options.eventTypes.toString().replace(new RegExp(',', 'g'), ' '), $.fn.readonly._eventBlocker);
                    $elmain.find(options.disableSelector).andSelf().each(function() {
                        var $el = $(this);
                        $el.prop('disabled', false);
                        $el.removeAttr('disabled');
                        var href = $el.prop('hrefbak');
                        if (href) {
                            $el.removeProp('hrefbak').prop('href', href);
                        }
                    });
                    if (typeof (Page_Validators) != 'undefined') { //asp.net validators
                        var excludedValidators = $elmain.data("readonly")["excludedValidators"];

                        $.each(excludedValidators, function() {
                            if ($.inArray(this, Page_Validators) == -1) {
                                Page_Validators.push(this);
                                var ctrl = document.getElementById(this.controltovalidate);
                                if (ctrl) {
                                    hookupValidator(ctrl, this);
                                }
                            }
                        });
                        $elmain.removeData("readonly");
                    }
                    if (options.grayout) {
                        $.fn.readonly.grayscale.reset(this);
                    }
                }
            });
        },
        _readonly: function(options) {
            function hookoffValidator(control, validator) {
                if (control.tagName != "INPUT" && control.tagName != "TEXTAREA" && control.tagName != "SELECT" && control.tagName != "TD") {
                    for (var i = 0; i < control.childNodes.length; i++) {
                        hookoffValidator(control.childNodes[i], validator);
                    }
                } else {
                    var vi = $.inArray(validator, control.Validators);
                    control.Validators.splice(vi, 1);
                }
            }
            //also allow single excludedValidator
            if (options && typeof options.excludeValidatorIds == "string") {
                options.excludeValidatorIds = [options.excludeValidatorIds];
            }

            var options = $.extend({}, $.fn.readonly.defaults, options);

            function DisableAspNetValidator(elem, excludedValidators) {
                if (elem.Validators != undefined) {
                    $.each(elem.Validators, function(index, validator) {
                        if ($.inArray(validator.id, options.excludeValidatorIds) == -1) {
                            var valIndex = $.inArray(validator, Page_Validators);
                            if (valIndex != -1) {
                                validator.isvalid = true;
                                ValidatorUpdateDisplay(validator);
                                excludedValidators.push(validator);
                                Page_Validators.splice(valIndex, 1);
                            }
                        }
                    });
                    $.each(excludedValidators, function(index, validator) {
                        hookoffValidator(elem, validator);
                    });
                    $(elem).data('excludedValidators', excludedValidators);
                }
            }

            return this.each(function() {
                var $elmain = $(this);
                if ($elmain.hasClass(options.readonlyClass) == false) {
                    //mark the main object
                    $elmain.addClass(options.readonlyClass);

                    var excludedValidators = [], disableSelection = $elmain.find(options.disableSelector);

                    if ($elmain.is(options.disableSelector))
                        disableSelection = disableSelection.andSelf();

                    disableSelection.each(function() {
                        var $el = $(this);
                        $el.prop('disabled', true);
                        $el.attr('disabled', 'disabled'); //target with css ex. a[disabled]
                        var hrefbak = $el.prop('href');
                        if (hrefbak) {
                            $el.prop('href', '').prop('hrefbak', hrefbak).removeAttr('href');
                        }
                        DisableAspNetValidator(this, excludedValidators);
                    });
                    $elmain.data("readonly", { "excludedValidators": excludedValidators });

                    $elmain.find(options.eventBlockSelector).andSelf().each(function() {
                        var $el = $(this);

                        //remove the onclick and put ir in jquery.click
                        var onclick = $el.prop('onclick');
                        if (onclick) {
                            $el.prop('onclick', '');
                            var onclickStr = onclick.toString().replace(new RegExp('postback.?=.?true;', 'g'), '').replace(new RegExp('[\n\r]*', 'g'), '');
                            if (onclickStr != 'functiononclick(){}' && onclickStr != 'functiononclick(event){}') {
                                $el.bind('click', onclick);
                            }
                        }

                        var events = $._data(this).events;

                        if (events) {
                            for (e = 0, eventTypesLength = options.eventTypes.length; e < eventTypesLength; e++) {
                                var eventType = options.eventTypes[e];
                                $el.bind(eventType, $.fn.readonly._eventBlocker);
                                //!! the bound handlers are executed in the order they where bound
                                //reorder the events
                                var handlers = events[eventType];
                                if (handlers) {
                                    var ourHandler = handlers[handlers.length - 1];
                                    for (i = handlers.length - 1; i > 0; i--) {
                                        handlers[i] = handlers[i - 1];
                                    }
                                    handlers[0] = ourHandler;
                                }
                            }
                        }
                    });
                    if (options.grayout) {
                        $.fn.readonly.grayscale(this);
                    }
                }
            });
        },
        _eventBlocker: function(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();

            return false;
        },
        /* -- grayscale.js --
        * Copyright (C) James Padolsey (http://james.padolsey.com)
        *
        * added fix for jqgrid in IE
        * added fix in  isExternal  (url.toLowerCase)
        * added urlCacheMapping => prevent desatIMG when the same url is already processed
        */
        grayscale: (function() {

            var config = {
                colorProps: ['color', 'backgroundColor', 'borderBottomColor', 'borderTopColor', 'borderLeftColor', 'borderRightColor', 'backgroundImage'],

                externalImageHandler: {
                    /* Grayscaling externally hosted images does not work
                    - Use these functions to handle those images as you so desire */
                    /* Out of convenience these functions are also used for browsers
                    like Chrome that do not support CanvasContext.getImageData */
                    init: function(el, src) {
                        if (el.nodeName.toLowerCase() === 'img') {
                            // Is IMG element...
                        } else {
                            // Is background-image element:
                            // Default - remove background images
                            data(el).backgroundImageSRC = src;
                            el.style.backgroundImage = '';
                        }
                    },
                    reset: function(el) {
                        if (el.nodeName.toLowerCase() === 'img') {
                            // Is IMG element...
                        } else {
                            // Is background-image element:
                            el.style.backgroundImage = 'url(' + (data(el).backgroundImageSRC || '') + ')';
                        }
                    }
                }
            }

            var data = (function() {

                var cache = [0],
            expando = 'data' + (+new Date()),
            urlcacheMapping = new Object();

                return function(elem) {
                    var cacheIndex;
                    var nextCacheIndex = cache.length;

                    if (typeof elem == 'string') { //url
                        var url = elem.toLowerCase();
                        if (!urlcacheMapping[url]) {
                            urlcacheMapping[url] = nextCacheIndex;
                            cache[nextCacheIndex] = {};
                        }
                        cacheIndex = urlcacheMapping[url];
                    }
                    else { //element
                        cacheIndex = elem[expando];
                        if (!cacheIndex) {
                            cacheIndex = elem[expando] = nextCacheIndex;
                            cache[cacheIndex] = {};
                        }
                    }
                    return cache[cacheIndex];
                };

            })();

            function isExternal(url) {
                // Checks whether URL is external: 'CanvasContext.getImageData'
                // only works if the image is on the current domain.
                return (new RegExp('https?://(?!' + window.location.hostname + ')')).test(url.toLowerCase());
            }
            function desatIMG(img, prepare, realEl) {
                // realEl is only set when img is temp (for BG images)
                var canvas = document.createElement('canvas'),
                context = canvas.getContext('2d'),
                height = img.naturalHeight || img.offsetHeight || img.height,
                width = img.naturalWidth || img.offsetWidth || img.width,
                imgData;

                canvas.height = height;
                canvas.width = width;
                context.drawImage(img, 0, 0);
                try {
                    imgData = context.getImageData(0, 0, width, height);
                } catch (e) { }

                for (var y = 0; y < height; y++) {
                    for (var x = 0; x < width; x++) {
                        var i = (y * width + x) * 4;
                        // Apply Monoschrome level across all channels:
                        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] =
                    RGBtoGRAYSCALE(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
                    }
                }

                context.putImageData(imgData, 0, 0, 0, 0, width, height);

                var url = img.getAttribute('src');
                data(url).dataURL = canvas.toDataURL();
                realEl ? (data(realEl).BGdataURL = canvas.toDataURL())
                               : (data(img).dataURL = canvas.toDataURL())

                return canvas;
            }
            function getStyle(el, prop) {
                var style = document.defaultView && document.defaultView.getComputedStyle ?
                        document.defaultView.getComputedStyle(el, null)[prop]
                        : el.currentStyle[prop];
                // If format is #FFFFFF: (convert to RGB)
                if (style && /^#[A-F0-9]/i.test(style)) {
                    var hex = style.match(/[A-F0-9]{2}/ig);
                    style = 'rgb(' + parseInt(hex[0], 16) + ','
                                   + parseInt(hex[1], 16) + ','
                                   + parseInt(hex[2], 16) + ')';
                }
                return style;
            }
            function RGBtoGRAYSCALE(r, g, b) {
                // Returns single monochrome figure:
                return parseInt((0.2125 * r) + (0.7154 * g) + (0.0721 * b), 10);
            }
            function getAllNodes(context) {
                var all = Array.prototype.slice.call(context.getElementsByTagName('*'));
                all.unshift(context);
                return all;
            }
            function ToBWUrl(url, suffix) {
                return url.replace(".", suffix + ".");
            }

            var init = function(context) {

                // Handle if a DOM collection is passed instead of a single el:
                if (context && context[0] && context.length && context[0].nodeName && context[0].nodeName.toLowerCase() != "option") {
                    // Is a DOM collection:
                    var allContexts = Array.prototype.slice.call(context),
                cIndex = -1, cLen = allContexts.length;
                    while (++cIndex < cLen) { init.call(this, allContexts[cIndex]); }
                    return;
                }

                context = context || document.documentElement;

                if (!document.createElement('canvas').getContext) {
                    context.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=1)';
                    context.style.msFilter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=1)';
                    context.style.zoom = 1;

                    //apply to all jqgrid - jqGrid FIX for IE - RH
                    $(context).find('.ui-jqgrid').each(function() {
                        this.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=1)';
                        this.style.msFilter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=1)';
                        this.style.zoom = 1;
                    });

                    return;
                }

                var all = getAllNodes(context), i = -1, len = all.length;

                while (++i < len) {
                    var cur = all[i];

                    if (cur.nodeName.toLowerCase() === 'img') {
                        var src = cur.getAttribute('src');
                        if (!src) { continue; }
                        if (isExternal(src)) {
                            config.externalImageHandler.init(cur, src);
                        } else {
                            data(cur).realSRC = src;
                            try {
                                // Within try statement just encase there's no support....
                                cur.src = data(src).dataURL || data(cur).dataURL || desatIMG(cur).toDataURL();
                            } catch (e) { config.externalImageHandler.init(cur, src); }
                        }

                    } else {
                        for (var pIndex = 0, pLen = config.colorProps.length; pIndex < pLen; pIndex++) {
                            var prop = config.colorProps[pIndex],
                    style = getStyle(cur, prop);
                            if (!style) { continue; }

                            if (cur.style[prop]) {
                                data(cur)[prop] = style;
                            }
                            // RGB color:
                            if (style.substring(0, 4) === 'rgb(') {
                                var monoRGB = RGBtoGRAYSCALE.apply(null, style.match(/\d+/g));
                                cur.style[prop] = style = 'rgb(' + monoRGB + ',' + monoRGB + ',' + monoRGB + ')';
                                continue;
                            }
                            // Background Image:
                            if (style.indexOf('url(') > -1) {
                                var urlPatt = /\(['"]?(.+?)['"]?\)/,
                            url = style.match(urlPatt)[1];
                                if (isExternal(url)) {
                                    config.externalImageHandler.init(cur, url);
                                    data(cur).externalBG = true;
                                    continue;
                                }
                                // data(cur).BGdataURL refers to caches URL (from preparation)
                                try {
                                    var imgSRC = data(url).dataURL || data(cur).BGdataURL || (function() {
                                        var temp = document.createElement('img');
                                        temp.src = url;
                                        return desatIMG(temp).toDataURL();
                                    })();

                                    cur.style[prop] = style.replace(urlPatt, function(_, url) {
                                        return '(' + imgSRC + ')';
                                    });
                                } catch (e) { config.externalImageHandler.init(cur, url); }
                            }
                        }
                    }
                }

            };

            init.reset = function(context) {
                // Handle if a DOM collection is passed instead of a single el:
                if (context && context[0] && context.length && context[0].nodeName && context[0].nodeName.toLowerCase() != "option") {
                    // Is a DOM collection:
                    var allContexts = Array.prototype.slice.call(context), cIndex = -1, cLen = allContexts.length;
                    while (++cIndex < cLen) { init.reset.call(this, allContexts[cIndex]); }
                    return;
                }
                context = context || document.documentElement;
                if (!document.createElement('canvas').getContext) {
                    context.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=0)';
                    context.style.msFilter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=0)';
                    context.style.zoom = 'normal';

                    //apply to all jqgrid - jqGrid FIX for IE - RH
                    $(context).find('.ui-jqgrid').each(function() {
                        this.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=0)';
                        this.style.msFilter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=0)';
                        this.style.zoom = 'normal';
                    });
                    return;
                }
                var all = getAllNodes(context), i = -1, len = all.length;
                while (++i < len) {
                    var cur = all[i];
                    if (cur.nodeName.toLowerCase() === 'img') {
                        var src = cur.getAttribute('src');
                        if (isExternal(src)) {
                            config.externalImageHandler.reset(cur, src);
                        }
                        cur.src = data(cur).realSRC || src;
                    } else {
                        for (var pIndex = 0, pLen = config.colorProps.length; pIndex < pLen; pIndex++) {
                            if (data(cur).externalBG) {
                                config.externalImageHandler.reset(cur);
                            }
                            var prop = config.colorProps[pIndex];
                            cur.style[prop] = data(cur)[prop] || '';
                        }
                    }
                }
            };
            return init;

        })()
    });
})(jQuery);