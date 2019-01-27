"use strict";

// Jan 2019 Dave B

class SavedGame {
    /** 
     * Creates a new instance of the SavedGame class
      * @param {Uint8Array} decompressedArrayBuffer - Saved game data
      * @param {string} name - Default filename to use when exporting
      */
    constructor(decompressedArrayBuffer, zipFilename) {
        this.zipFilename = zipFilename;
        this.initialize(decompressedArrayBuffer);
    }

    /** 
     * Initializes (or re-initializes) the class
      * @param {Uint8Array} decompressedArrayBuffer - Saved game data
      */
    initialize(decompressedArrayBuffer) {
        this.index = {};
        this.files = [];
        this.decompressed = decompressedArrayBuffer;
        this.position = 0;

        // Saved game format is repeated blocks of
        //   {BSTR Filename, UInt32 dataSize, byte[] dataContent }
        // until you hit the end of the file
        while (!this.eof()) {
            var filename = this.readString();
            var filesize = this.readInt32();
            var entry = {
                filename: filename,
                filesize: filesize,
                offset: this.position
            };
            this.files.push(entry);
            this.index[entry.filename] = entry;

            Log("Found file '" + filename + "' length " + filesize + " at offset " + this.position);
            this.skipBytes(filesize);
        }
    }

    /**
     * Reads a single unsigned byte from the saved game data and 
     * advances the position in the file by one byte
      * @return {number} Read value
      */
    readByte() {
        return this.decompressed[this.position++];
    }

    /**
     * Reads a unsigned 16-bit word from the saved game data and
      * advances the position in the file by two byte
      * @return {number} Read value
      */
    readInt16() {
        return this.readByte() + 0x100 * this.readByte();
    }

    /**
     * Reads a unsigned 32-bit long from the saved game data and
      * advances the position in the file by two byte
      * @return {number} Read value
      */
    readInt32() {
        return this.readInt16() + 0x10000 * this.readInt16();
    }

    /**
     * Reads a BSTR from the saved game data and advances the
      * position in the file to just past the end of the string
      * @return {string} Read value
      */
    readString() {
        var strLen = this.readInt32();
        if (strLen > 4096) throw new Error("Found a string longer than 4K");
        var string = "";
        for (var i = 0; i < strLen; i++) {
            string += String.fromCharCode(this.readInt16());
        }

        return string;
    }

    /**
     * Advances the position in the file by the specified number of bytes
      * @param {number} count - Bytes to skip
      */
    skipBytes(count) {
        this.position += count;
    }

    /**
     * Checks for the end of the file
     * @return {boolean} True if EOF, otherwise false
     */
    eof() {
        return this.position >= this.decompressed.byteLength;
    }

    /** 
     *  Compresses the data and presents the user with the save dialog
     */
    export() {

        // GZip up the data
        var compressed = pako.gzip(this.decompressed);

        // Export it
        var blob = new Blob([compressed]);
        if (window.navigator.msSaveOrOpenBlob)
            window.navigator.msSaveBlob(blob, this.zipFilename);
        else {
            var a = window.document.createElement("a");
            a.href = window.URL.createObjectURL(blob, { type: "application/octet-stream" });
            a.download = this.zipFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    /**
     * Gets the bytes associated with the specific file in the saved game data
      * @param {string} filename - The name of the file (player.dat, city_1.dat, etc)
      * @return {Uint8Array} File contents (as bytes)
      */
    getBytes(filename) {
        var file = this.index[filename];
        if (file == null) throw new Error("File '" + filename + "' not found in index");   // Should never happen
        return this.decompressed.slice(file.offset, file.offset + file.filesize);
    }

    /**
     * Returns a file from inside the save game as a JSON string
      * @param {string} filename - The name of the file (player.dat, city_1.dat, etc)
      * @return {string} File contents (as JSON string)
      */
    getJsonString(filename) {
        return Utf8ToString(this.getBytes(filename));
    }

    /**
     * Returns a file from inside the save game as a JSON object
       * @param {string} filename - The name of the file (player.dat, city_1.dat, etc)
       * @return {object} Data as a JSON object
       */
    getJson(filename) {
        return JSON.parse(this.getJsonString(filename));
    }

    /**
     * Maps then saved game name of a character to the name shown in the actual game UI
     * @param {string} name - Name as it appears in the saved game file
     * @returns {string} Name as it appears in the game UI
     */
    mapCharacterName(name) {
        switch (name) {
            case "Wolfter": return "Dzhulbars";
            case "Gexogen": return "Hexogen";
            default: return name;
        }
    }

    /**
     * Updates (but does not export) a JSON file
      * @param {string} filename - The name of the file (player.dat, city_1.dat, etc)
      * @param {object} jsonObj - JSON object
      */
    updateJson(filename, jsonObj) {
        Log(`'${filename}' has been updated, converting JSON to UTF8 byte array and updating in-memory copy of saved game.`);
        var jsonString = JSON.stringify(jsonObj);
        var jsonBytes = StringToUtf8(jsonString);
        var jsonByteLength = jsonBytes.length;

        var file = this.index[filename];
        var buffer = new Uint8Array(this.decompressed.byteLength - file.filesize + jsonByteLength);
        buffer.set(this.decompressed.slice(0, file.offset - 4), 0);                                             // Everything before the updated file
        buffer.set(this.writeUInt32(jsonByteLength), file.offset - 4);                                          // Size of the updated file
        buffer.set(jsonBytes, file.offset);                                                                     // The updated file
        buffer.set(this.decompressed.slice(file.offset + file.filesize), file.offset + jsonByteLength);         // Everything after the updated file

        Log("Reinitializing saved game object...");
        this.initialize(buffer);
    }

    /** 
     * Writes a Uint32 name to a buffer
      * @param {number} unit32 - The value to be written
      * @return {Uint8Array} The generated buffer
      */
    writeUInt32(uint32) {
        var temp = new Uint8Array(4);
        temp[0] = uint32 % 0x100;
        temp[1] = (uint32 >> 8) % 0x100;
        temp[2] = (uint32 >> 16) % 0x100;
        temp[3] = (uint32 >> 24) % 0x100;
        return temp;
    }

    /* Not currently used
    writeUnicode(str) {
        var len = str.length;
        var temp = new Uint8Array(len * 2);
        for (var i = 0; i < str.length; i++) {
            var charCode = str.charAt(i);
            temp[i * 2] = charCode % 0x100;
            temp[i * 2 + 1] = (charCode >> 8) % 0x100;
        }

        return temp;
    }
    */
}
