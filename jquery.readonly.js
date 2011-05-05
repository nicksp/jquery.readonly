/*
Readonly plugin for jquery
http://github.com/RobinHerbots/jquery.readonly
Copyright (c) 2011 Robin Herbots
Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
Version: 0.0.4

-- grayscale function -- Copyright (C) James Padolsey (http://james.padolsey.com)
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
        return _fn.apply(this, arguments);
    };

    $.fn.extend($.fn.readonly, {
        defaults: {
            eventTypes: ['blur', 'focus', 'focusin', 'focusout', 'load', 'resize', 'scroll', 'unload', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'change', 'select', 'submit', 'keydown', 'keypress', 'keyup', 'error'],
            grayout: true,
            eventBlockSelector: '*', //defines the element(s) to block the eventTypes on
            disableSelector: "input[type!='submit'], select, a", //defines the element(s) to disable
            usePrerenderedImages: false, //should be used in combination of prepare
            prerenderSuffix: '_bw'
        },
        prepare: function(options) {
            var options = $.extend({}, $.fn.readonly.defaults, options);
            if (options.grayout) {
                return this.each(function() {
                    $.fn.readonly.grayscale.options.usePrerenderedImages = options.usePrerenderedImages;
                    $.fn.readonly.grayscale.options.prerenderSuffix = options.prerenderSuffix;
                    $.fn.readonly.grayscale.prepare(this);
                });
            }
        },
        reset: function(options) {
            var options = $.extend({}, $.fn.readonly.defaults, options);
            return this.each(function() {
                var $el = $(this);
                if ($el.hasClass('readonly') == true) {
                    //unmark the main object
                    $el.removeClass('readonly');
                    $el.find(options.eventBlockSelector).andSelf().unbind(options.eventTypes.toString().replace(new RegExp(',', 'g'), ' '), $.fn.readonly._eventBlocker);
                    $el.find(options.disableSelector).andSelf().each(function() {
                        var $el = $(this);
                        $el.prop('disabled', false);
                        var href = $el.prop('hrefbak');
                        if (href) {
                            $el.removeProp('hrefbak').prop('href', href);
                        }
                    });
                    if (options.grayout) {
                        $.fn.readonly.grayscale.options.usePrerenderedImages = options.usePrerenderedImages;
                        $.fn.readonly.grayscale.options.prerenderSuffix = options.prerenderSuffix;
                        $.fn.readonly.grayscale.reset(this);
                    }
                }
            });
        },
        _readonly: function(options) {
            var options = $.extend({}, $.fn.readonly.defaults, options);

            return this.each(function() {
                var $elmain = $(this);
                if ($elmain.hasClass('readonly') == false) {
                    //mark the main object
                    $elmain.addClass('readonly');

                    $elmain.find(options.disableSelector).andSelf().each(function() {
                        var $el = $(this);
                        $el.prop('disabled', true);
                        var hrefbak = $el.prop('href');
                        if (hrefbak) {
                            $el.prop('href', '').prop('hrefbak', hrefbak);
                        }
                    });

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
                                var ourHandler = handlers[handlers.length - 1];
                                for (i = handlers.length - 1; i > 0; i--) {
                                    handlers[i] = handlers[i - 1];
                                }
                                handlers[0] = ourHandler;
                            }
                        }
                    });
                    if (options.grayout) {
                        $.fn.readonly.grayscale.options.usePrerenderedImages = options.usePrerenderedImages;
                        $.fn.readonly.grayscale.options.prerenderSuffix = options.prerenderSuffix;
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
            },
            //        log = function() {
            //            try { window.console.log.apply(console, arguments); }
            //            catch (e) { };
            //        },
        isExternal = function(url) {
            // Checks whether URL is external: 'CanvasContext.getImageData'
            // only works if the image is on the current domain.
            return (new RegExp('https?://(?!' + window.location.hostname + ')')).test(url.toLowerCase());
        },
        data = (function() {

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

        })(),
        desatIMG = function(img, prepare, realEl) {
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

            if (prepare) {
                desatIMG.preparing = true;
                // Slowly recurse through pixels for prep,
                // :: only occurs on grayscale.prepare()
                var y = 0;
                (function() {

                    if (!desatIMG.preparing) { return; }

                    if (y === height) {
                        // Finished!
                        context.putImageData(imgData, 0, 0, 0, 0, width, height);

                        var url = img.getAttribute('src');
                        data(url).dataURL = canvas.toDataURL();
                        realEl ? (data(realEl).BGdataURL = canvas.toDataURL())
                               : (data(img).dataURL = canvas.toDataURL())
                    }

                    for (var x = 0; x < width; x++) {
                        var i = (y * width + x) * 4;
                        // Apply Monochrome level across all channels:
                        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] =
                        RGBtoGRAYSCALE(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
                    }

                    y++;
                    setTimeout(arguments.callee, 0);

                })();
                return;
            } else {
                // If desatIMG was called without 'prepare' flag
                // then cancel recursion and proceed with force! (below)
                desatIMG.preparing = false;
            }

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
        },
        getStyle = function(el, prop) {
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
        },
        RGBtoGRAYSCALE = function(r, g, b) {
            // Returns single monochrome figure:
            return parseInt((0.2125 * r) + (0.7154 * g) + (0.0721 * b), 10);
        },
        getAllNodes = function(context) {
            var all = Array.prototype.slice.call(context.getElementsByTagName('*'));
            all.unshift(context);
            return all;
        },
        ToBWUrl = function(url, suffix) {
            return url.replace(".", suffix + ".");
        };

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
                    context.style.zoom = 1;

                    //apply to all jqgrid - jqGrid FIX for IE - RH
                    $(context).find('.ui-jqgrid').each(function() {
                        this.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=1)';
                        this.style.zoom = 1;
                    });

                    return;
                }

                var all = getAllNodes(context),
            i = -1, len = all.length;

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
                    var allContexts = Array.prototype.slice.call(context),
                cIndex = -1, cLen = allContexts.length;
                    while (++cIndex < cLen) { init.reset.call(this, allContexts[cIndex]); }
                    return;
                }
                context = context || document.documentElement;
                if (!document.createElement('canvas').getContext) {
                    context.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=0)';

                    //apply to all jqgrid - jqGrid FIX for IE - RH
                    $(context).find('.ui-jqgrid').each(function() {
                        this.style.filter = 'progid:DXImageTransform.Microsoft.BasicImage(grayscale=0)';
                        this.style.zoom = 'normal';
                    });
                    return;
                }
                var all = getAllNodes(context),
            i = -1, len = all.length;
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

            init.prepare = function(context) {

                // Handle if a DOM collection is passed instead of a single el:
                if (context && context[0] && context.length && context[0].nodeName) {
                    // Is a DOM collection:
                    var allContexts = Array.prototype.slice.call(context),
                cIndex = -1, cLen = allContexts.length;
                    while (++cIndex < cLen) { init.prepare.call(null, allContexts[cIndex]); }
                    return;
                }

                // Slowly recurses through all elements
                // so as not to lock up on the user.

                context = context || document.documentElement;

                if (!document.createElement('canvas').getContext) { return; }

                var all = getAllNodes(context), i = -1, len = all.length;

                while (++i < len) {
                    var cur = all[i];
                    if (data(cur).skip) { return; }
                    if (cur.nodeName.toLowerCase() === 'img') {
                        if (cur.getAttribute('src') && !isExternal(cur.src) && !data(cur.src).dataURL) {
                            if (!this.options.usePrerenderedImages) {
                                desatIMG(cur, true);
                            }
                            else {
                                var bwUrl = ToBWUrl(cur.src, this.options.prerenderSuffix);
                                $.ajax({
                                    async: false,
                                    url: bwUrl,
                                    contentType: 'application/x-www-form-urlencoded',
                                    dataType: 'html',
                                    type: 'HEAD',
                                    error: function() {
                                        desatIMG(cur, true);
                                    },
                                    success: function() {
                                        data(cur.src).dataURL = bwUrl;
                                    },
                                    dataFilter: null
                                });
                            }
                        }

                    } else {
                        var style = getStyle(cur, 'backgroundImage');
                        if (style.indexOf('url(') > -1) {
                            var urlPatt = /\(['"]?(.+?)['"]?\)/,
                        url = style.match(urlPatt)[1];
                            if (!isExternal(url) && !data(url).dataURL) {
                                if (!this.options.usePrerenderedImages) {
                                    var temp = document.createElement('img');
                                    temp.src = url;
                                    desatIMG(temp, true, cur);
                                }
                                else {
                                    var bwUrl = ToBWUrl(url, this.options.prerenderSuffix);
                                    $.ajax({
                                        async: false,
                                        url: bwUrl,
                                        contentType: 'application/x-www-form-urlencoded',
                                        dataType: 'html',
                                        type: 'HEAD',
                                        error: function() {
                                            var temp = document.createElement('img');
                                            temp.src = url;
                                            desatIMG(temp, true, cur);
                                        },
                                        success: function() {
                                            data(url).dataURL = bwUrl;
                                        },
                                        dataFilter: null
                                    });
                                }
                            }
                        }
                    }
                }
            };
            init.options = {
                usePrerenderedImages: false,
                prerenderSuffix: '_bw'
            };
            return init;

        })()
    });
})(jQuery);