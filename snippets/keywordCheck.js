'use strict';
const vscode = require('vscode');
const mRegEx = /(abstract\W|allresults\W|and\W|andif\W|block\W|catch\W|clone\W|constant\W|continue\W|div\W|dynamic\W|elif\W|else\W|endblock\W|endcatch\W|endif\W|endlock\W|endloop\W|endmethod\W|endproc\W|endprotect\W|endtry\W|false\W|finally\W|for\W|gather\W|global\W|handling\W|if\W|import\W|is\W|isnt\W|iter\W|leave\W|local\W|lock\W|loop\W|loopbody()|maybe\W|method\W|mod\W|no_way\W|not\W|optional\W|or\W|orif\W|over\W|package\W|pragma\W|private\W|proc\W|protect\W|locking\W|protection\W|recursive\W|return\W|scatter\W|self\W|super\W|then\W|thisthread\W|throw\W|true\W|try\W|unset\W|when\W|with\W|xor)/ig;
const uRegEx = /('|"|#|abstract\W|allresults\W|and\W|andif\W|block\W|catch\W|clone\W|constant\W|continue\W|div\W|dynamic\W|elif\W|else\W|endblock\W|endcatch\W|endif\W|endlock\W|endloop\W|endmethod\W|endproc\W|endprotect\W|endtry\W|false\W|finally\W|for\W|gather\W|global\W|handling\W|if\W|import\W|is\W|isnt\W|iter\W|leave\W|local\W|lock\W|loop\W|loopbody()|maybe\W|method\W|mod\W|no_way\W|not\W|optional\W|or\W|orif\W|over\W|package\W|pragma\W|private\W|proc\W|protect\W|locking\W|protection\W|recursive\W|return\W|scatter\W|self\W|super\W|then\W|thisthread\W|throw\W|true\W|try\W|unset\W|when\W|with\W|xor\W)/ig;

class keywordCheck{
    run() {
        vscode.window.onDidChangeActiveTextEditor(event => {
            this.getCurrentWordForNewActiveTextEditor(event);
        });
        vscode.window.onDidChangeTextEditorSelection(event => {
            this.getCurrentWord(event);
        });
        vscode.workspace.onDidChangeTextDocument(event => {
            this.updatePairedTag(event);
        });
    }
    getCurrentWordForNewActiveTextEditor(editor) {
        if (!editor) {
            return;
        }
        let document = editor.document;
        if(document.languageId != "magik") 
             return;

        let selection = editor.selection;
        let word = this.findKeyword(document, selection.active);
        this._word = word;
    }
    getCurrentWord(event) {
        let selection = event.selections[0];
        let document = event.textEditor.document;
        let word = this.findKeyword(document, selection.active);
        this._word = word;
    }
    getWordAtPosition(document, position) {
        let textLine = document.lineAt(position);
        let text = textLine.text;
        let result = null;
        let character = position.character;
        while ((result = mRegEx.exec(text)) !== null) {
           if (!result[1]) {
                if (result.index + 1 === character) {
                   return "";
                }
            }
            else {
                if (result.index + 1 <= character && character <= result.index + 1 + result[1].length) {
                    return result[1];
                }
            }
        }
        return null;
    }
    isEnabled() {
        let languageId = vscode.window.activeTextEditor.document.languageId;
        let config = vscode.workspace.getConfiguration('auto-rename-tag');
        let languages = config.get("activationOnLanguage", ["magik"]);
        if (languages.indexOf("*") === -1 && languages.lastIndexOf(languageId) === -1) {
            return false;
        }
        else {
            return true;
        }
    }
    updatePairedTag(event) {
        if (!this.isEnabled() || /\r|\n/.test(event.contentChanges[0].text) || !event.contentChanges[0].range.isSingleLine) {
            return;
        }
        let editor = vscode.window.activeTextEditor;
        let document = editor.document;
        let selection = editor.selection;
        let cursorPositon = selection.active;
        let rangeStart = event.contentChanges[0].range.start;
        let rangeEnd = event.contentChanges[0].range.end;
        if (!rangeStart.isEqual(rangeEnd)) {
            // Handle deletion or update of multi-character
            if (rangeStart.isBefore(rangeEnd)) {
                cursorPositon = rangeStart;
            }
            else {
                cursorPositon = rangeEnd;
            }
        }
        let newKey = this.findKeyword(document, cursorPositon);
        if (newKey != null) {
             this.keyCheck(document, editor, newKey);
        }
    }
    findKeyword(document, cursorPositon) {
        let textLine = document.lineAt(cursorPositon);
        let text = textLine.text;
       // Keywords and exception chars
        let result = null;
        var strFlag = 1;
        let cpos = cursorPositon.character;
        while ((result = uRegEx.exec(text)) !== null) {
           var index = result.index;
           var kword = result[0];
           if (index > cpos || kword == "#") {
               return null;
           } else if  (kword == "'" || kword == '"'){
               // a string indicator
               strFlag = -1 * strFlag;
           } else if  (strFlag < 0){
               // ignore, inside a string indicator
           } else if  (index < cpos-kword.length || cpos+1 < index+kword.length){
               // ignore, pre-index 
           } else if  (index!=0 && /\w/.test(text[index-1])){
               // ignore, pre-index 
           } else if  (index==0 || text[index-1]!='_'){
               kword = "_"+kword.slice(0,kword.length-1);
               let pos2 = document.offsetAt(cursorPositon);
               let pos1 = pos2 - kword.length+1;   
               return {string: kword, index: index, offset1: pos1, offset2: pos2};
            } 
        }
        return null;
    }
    keyCheck(document, editor, kword) {
        editor.edit((editBuilder) => {
            let pos1 = document.positionAt(kword.offset1);
            let pos2 = document.positionAt(kword.offset2);
            editBuilder.replace(new vscode.Range(pos1, pos2), kword.string);
       });
    }
}
exports.keywordCheck = keywordCheck    

