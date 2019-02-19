// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
const vscode = require('vscode');
const uRegEx = /\b(abstract|allresults|and|andif|block|catch|clone|constant|continue|div|dynamic|elif|else|endblock|endcatch|endif|endlock|endloop|endmethod|endproc|endprotect|endtry|false|finally|for|gather|global|handling|if|import|is|isnt|iter|leave|local|lock|loop|loopbody|maybe|method|mod|no_way|optional|or|orif|over|package|pragma|private|proc|protect|locking|protection|recursive|return|scatter|self|super|then|thisthread|throw|true|try|unset|when|with|xor)\W/ig;

class keywordCheck{
    provideOnTypeFormattingEdits(document, position,
        ch,//: string, 
        options,//: vscode.FormattingOptions, 
        token){//: vscode.CancellationToken):
       // Thenable<vscode.TextEdit[]>;
    console.log(ch);
    };

    run(context) {
        // vscode.window.onDidChangeActiveTextEditor(event => {
        //     this.getCurrentWordForNewActiveTextEditor(event);
        // });
        // vscode.window.onDidChangeTextEditorSelection(event => {
        //     this.getCurrentWord(event);
        // });
        vscode.workspace.onDidChangeTextDocument(event => {
            this.autocorrectKeyword(event);
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

     autocorrectKeyword(event) {
        let cChng = event.contentChanges[0];
        if (cChng == undefined) return ;

        let editor = vscode.window.activeTextEditor;
        let document = editor.document;
        if (document.languageId != "magik" || /\r|\n/.test(cChng.text) || !cChng.range.isSingleLine) 
            return;

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
             this.editKeyword(document, editor, newKey);
        }
    };

    findKeyword(document, cursorPositon) {
        let textLine = document.lineAt(cursorPositon);
        let text = textLine.text.split('#')[0];
        let cpos = cursorPositon.character ;
        if (cpos>=text.length) return null;
        text = text.slice(0,cpos+1);
        // trim symbols & strings
        [['"','"'],["'","'"],[":|","|"]].forEach( function(ch){
            var c;
            while ((c = text.indexOf(ch[0])) >=0 ){
                text = text.slice(c+ch[0].length);
                if ((c = text.indexOf(ch[1]))<0) 
                    text = "";
                else 
                    text = text.slice(c+1);
            };
        }); 

        // Keywords and exception chars
        let result = null;
        while ((result = uRegEx.exec(text)) !== null) {
           var index = result.index;
           var kword = result[0];
           cpos = text.length - kword.length;
           if (index>0 && text[index-1]== ":" ){
              // ignore symbols
            } else if  (index < cpos){
               // ignore, pre-index 
           } else if  (index!=0 && (result = /[.?!|]/.test(text[index-1])))  {
               // ignore, prefix exceptions 
           } else {
                kword = "_"+kword.slice(0,kword.length-1);
                let pos2 = document.offsetAt(cursorPositon);
                let pos1 = pos2 - kword.length+1;   
               return {string: kword, index: index, offset1: pos1, offset2: pos2};
            } 
        }
        return null;
    };
    editKeyword(document, editor, kword) {
        editor.edit((editBuilder) => {
            let pos1 = document.positionAt(kword.offset1);
            let pos2 = document.positionAt(kword.offset2);
            editBuilder.replace(new vscode.Range(pos1, pos2), kword.string);
       });
    }
    provideCompletionItems(document, position, token) {
        var conf = vscode.workspace.getConfiguration('magik', document.uri);
        return this.provideCompletionItemsInternal(document, position, token, conf).then(result => {
            if (!result) {
                return new vscode.CompletionList([], false);
            }
            if (Array.isArray(result)) {
                return new vscode.CompletionList(result, false);
            }
            return result;
        });
    }
   
}
exports.keywordCheck = keywordCheck    

