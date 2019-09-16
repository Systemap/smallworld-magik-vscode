// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
const vscode = require('vscode');
const magikParser = require('./magikParser');

const uRegEx = /\b(abstract|allresults|and|andif|block|catch|clone|constant|continue|div|dynamic|elif|else|endblock|endcatch|endif|endlock|endloop|endmethod|endproc|endprotect|endtry|false|finally|for|gather|global|handling|if|import|is|isnt|iter|leave|local|lock|loop|loopbody|maybe|method|mod|no_way|not|optional|or|orif|over|package|pragma|private|proc|protect|locking|protection|recursive|return|scatter|self|super|then|thisthread|throw|true|try|unset|when|while|with|xor)[^\w!?]/ig;

class keywordCheck{
    constructor() {
        this.autoCorrectDisabled = false;
        var editor =  vscode.window.activeTextEditor;
        this.activeTextEditor =  this.checkActiveTextEditor(editor);
    }

    provideOnTypeFormattingEdits(document, position,
        ch,//: string, 
        options,//: vscode.FormattingOptions, 
        token){//: vscode.CancellationToken):
       // Thenable<vscode.TextEdit[]>;
    console.log(ch);
    };

    run(context) {
        context.subscriptions.push( vscode.window.onDidChangeActiveTextEditor(event => {this.checkActiveTextEditor(event)}) );
        context.subscriptions.push( vscode.workspace.onDidChangeTextDocument(event => {this.autocorrectKeyword(event)}) );
    }
	
    checkActiveTextEditor(editor) {
        if (editor && editor.document.languageId == "magik") 
            this.activeTextEditor = editor;
        else 
          this.activeTextEditor = null;

        return this.activeTextEditor;
    }

    getCurrentWord(event) {
        let selection = event.selections[0];
        let document = event.textEditor.document;
        let word = this.findKeyword(document, selection.active);
        this._word = word;
    }

    autocorrectKeyword(event) {
        let editor = this.activeTextEditor;
        if (!editor) return ;
        let cChng = event.contentChanges[0];
        if (cChng == undefined || cChng.rangeLength > 0) return ;
        let document = event.document;
        var cursorPositon = cChng.range.end;

        let newKey = this.findKeyword(document, cursorPositon);
        if (newKey){
            this.autoCorrectDisabled = true;
            this.editKeyword(document, editor, newKey);
            this.autoCorrectDisabled = false;
        }
    };

    findKeyword(document, cursorPositon) {
        let lineText = document.lineAt(cursorPositon).text;
        let cpos = cursorPositon.character ;
        if (magikParser.testInString(lineText,cpos,true)) return;

        // Keywords and exception chars
        let result = null;
        while ((result = uRegEx.exec(lineText)) !== null) {
            var index = result.index;
            var kword = result[0];
            if  (index != cpos-kword.length+1){
               // ignore, pre-index or post-index
            } else if  ( index>0 &&  /[:.?!|]/.test(lineText[index-1]) )  {
                // ignore, prefix exceptions 
            // } else if  ( /[.?!|]/.test(lineText[cpos]) )  {
                // ignore, prefix exceptions 
            } else {
                kword = "_"+kword.slice(0,kword.length-1);
                let pos2 = document.offsetAt(cursorPositon);
                let pos1 = pos2 - kword.length+1;   
               return {string: kword, index: index, offset1: pos1, offset2: pos2};
            } 
        }
        return null;
    }

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

