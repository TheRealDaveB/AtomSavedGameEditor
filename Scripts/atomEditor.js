"use strict";

// Jan 2019 Dave B

////////////////////////////////////////////////////////////////////////
// Log APIs
////////////////////////////////////////////////////////////////////////
var $log;
var $logButton;
var logCount;

/**
 * Initialize the Log
 */
function InitializeLog() {
    $log = $("#log");
    $logButton = $("#logButton");
    ClearLog();
}

/** 
 * Logs an message to the on-screen Log and the console
  * @param {string} text - The text to be logged
  * @param {boolean} isError - true is text is an error message
  */
function Log(text, isError) {
    $log.append(`<li${isError ? " style='color:red'" : ""}>${EscapeHtml(text)}</li>`);
    console.log(text);
    logCount++;
    $logButton.text("Log (" + logCount + " messages)");
}

/**
 * Clears the Log
 */
function ClearLog() {

    $log.html("");
    logCount = 0;
    Log("New log started");
}


////////////////////////////////////////////////////////////////////////
// HTML APIs
////////////////////////////////////////////////////////////////////////

/**
 * Check required HTML 5 APIs are supported
 */
function CheckFileApisSupported() {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Required File APIs are supported.
    } else {
        throw new Error('The File APIs are not fully supported in this browser. Sorry, you can&apos;t use this site :-(');
    }
}

/**
 * Escapes a character string for safe (and accurate) rending in HTML
  * @param {string} html - The text to escape
  * @return {string} The escaped text
  */
function EscapeHtml(html) {
    var text = document.createTextNode(html);
    var p = document.createElement('p');
    p.appendChild(text);
    return p.innerHTML;
}

////////////////////////////////////////////////////////////////////////
// JSON APIs
////////////////////////////////////////////////////////////////////////

/**
 * Retuns the value of the property at the specified path into the JSON
  * @param {object} jsonObj - JSON
  * @param {string} path - The property path (e.g. a.b.c)
  * @return {any} Property value
  */
function GetProperty(jsonObj, path) {
    var obj = jsonObj;
    var parts = path.split('.');
    for (var i = 0, len = parts.length; i < len; i++) {
        obj = obj[parts[i]];
    };

    return obj;
};

/**
 * Sets the value of the property at the specified path into the JSON
 * @param {object} jsonObj - JSON
 * @param {string} path - The property path (e.g. a.b.c)
 * @param {any} value - The value to asign
 */
function SetProperty(jsonObj, path, value) {
    var obj = jsonObj;
    var parts = path.split('.');
    for (var i = 0, len = parts.length - 1; i < len; i++) {
        obj = obj[parts[i]];
    };

    obj[parts[i]] = value;
};

/** 
 * Generates an indented and multiline string resprentation of a JSON object
  * @param {object} json - The JSON object
  * @return {string} Indented and multiline string resprentation of a JSON object
  */
function PrettifyJson(json) {
    return JSON.stringify(json, null, 4); // 4 to match Monaco's defaults
}


////////////////////////////////////////////////////////////////////////
// Text APIs

/**
 * Generates an string from UTF8 bytes
  * @param {Uint8Array} data - The UTF8 data
  * @return {string} Unicode string representation
  */
function Utf8ToString(data) {
    // Sourced from https://weblog.rogueamoeba.com/2017/02/27/javascript-correctly-converting-a-byte-array-to-a-utf-8-string/
    const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
    var count = data.length;
    var str = "";

    for (var index = 0; index < count;) {
        var ch = data[index++];
        if (ch & 0x80) {
            Log("Non-ASCII char detected during Utf8ToString operation!", true);
            var extra = extraByteMap[(ch >> 3) & 0x07];
            if (!(ch & 0x40) || !extra || ((index + extra) > count))
                return null;

            ch = ch & (0x3F >> extra);
            for (; extra > 0; extra -= 1) {
                var chx = data[index++];
                if ((chx & 0xC0) != 0x80)
                    return null;

                ch = (ch << 6) | (chx & 0x3F);
            }
        }

        str += String.fromCharCode(ch);
    }

    return str;
}

/** 
  *  Generates UTF8 bytes from a Unicode string
   * @param {string} data - Unicode string representation
   * @return {Uint8Array} The UTF8 data
   */
function StringToUtf8(str) {
    // Sourced from https://gist.github.com/joni/3760795
    var utf8 = [];
    for (var i = 0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else {
            Log("Non-ASCII character detected during StringToUtf8 operation!", true);
            if (charcode < 0x800) {
                utf8.push(0xc0 | (charcode >> 6),
                    0x80 | (charcode & 0x3f));
            }
            else if (charcode < 0xd800 || charcode >= 0xe000) {
                utf8.push(0xe0 | (charcode >> 12),
                    0x80 | ((charcode >> 6) & 0x3f),
                    0x80 | (charcode & 0x3f));
            }

            // surrogate pair
            else {
                i++;
                // UTF-16 encodes 0x10000-0x10FFFF by
                // subtracting 0x10000 and splitting the
                // 20 bits of 0x0-0xFFFFF into two halves
                charcode = 0x10000 + (((charcode & 0x3ff) << 10)
                    | (str.charCodeAt(i) & 0x3ff))
                utf8.push(0xf0 | (charcode >> 18),
                    0x80 | ((charcode >> 12) & 0x3f),
                    0x80 | ((charcode >> 6) & 0x3f),
                    0x80 | (charcode & 0x3f));
            }
        }
    }

    return utf8;
}