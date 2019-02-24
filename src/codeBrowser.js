// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------'use strict';
const vscode = require('vscode');
const fs=require("fs");
const vsSK = vscode.SymbolKind;
var magikKeys=null;
const magikSymbols = {
    _method                : ['_method',                 '_endmethod',vsSK.Method],
    _proc                  : [ '_proc',                  '_endproc', vsSK.Function],
    _block                 : ['_block',                  '_endblock',vsSK.Function],
    _global                : ['_global',                 '_global', vsSK.Variable],
    _dynamic               : ['_dynamic',                '_dynamic', vsSK.Variable],
    def_mixin              : ['def_mixin',               ')', vsSK.Property], 
    def_slotted_exemplar   : ['def_slotted_exemplar',    ')', vsSK.Property], 
    define_slot_access     : ['define_slot_access',      ')', vsSK.Property], 
    define_shared_variable : ['define_shared_variable',  ')', vsSK.Variable], 
    define_shared_constant : ['define_shared_constant',  ')', vsSK.Constant], 
    define_property        : ['define_property',         ')', vsSK.Property], 
    def_property           : ['def_property' ,           ')', vsSK.Property],
    condition              : ['condition.define_condition',  ')', vsSK.Constant],
    register_new           : ['magik_session.register_new',  ')', vsSK.Module],
    register_application   : ['smallworld_product.register_application',  ')', vsSK.Module],
    'sw!patch_software'    : ['sw!patch_software',      ')', vsSK.Module]
};

const swWorkspaceSymbols = {index: [], cache: [], paths: []};

class codeBrowser{
    constructor() {
        this.swWorkspaceSymbols = swWorkspaceSymbols;
        this.magikStringPattern = {           
             '"': /[^"]/,
            "'":  /[^']/,
            ":|": /[^|]/,
            ":" : /[a-z!?_A-Z0-9]/,
            "%":  /(%\.|%space|%tab|%newline)/
        };
    };
        
    provideDocumentSymbols(document, token) {
        var docUri = document.fileName;
        var symInfos;
        if(docUri.endsWith(".magik")) 
            symInfos = this.get_magikSymbols(document, token); 
        else if(docUri.endsWith("\module.def"))
            symInfos = this.get_moduleSymbols(document, token);
        else if(docUri.endsWith("\product.def"))
            symInfos = this.get_moduleSymbols(document, token);
        else if (docUri.endsWith("\gis_aliases"))
            symInfos = this.get_gisSymbols(document, token);
        else if (docUri.endsWith("\environment.bat"))
            symInfos = this.get_gisSymbols(document, token);
        else 
            return [];

        var i = swWorkspaceSymbols.index.indexOf(docUri);
        if (  i < 0 ) {    
            swWorkspaceSymbols.cache.push(symInfos);    
            swWorkspaceSymbols.index.push(docUri);  
        } else swWorkspaceSymbols.cache[i] = symInfos;         

        return  symInfos;   
    };

    get_WorkspaceSymbols(rootPath, token) {

        if (swWorkspaceSymbols.paths.indexOf(rootPath)<0) {

    
            // --- walk thru the folders for .magik files
            var magikfiles = [];
            var walk = function(dir) {
                var list = fs.readdirSync(dir) 
                for(var i in list){
                    var file = dir + '/' + list[i];
                    var stat = fs.statSync(file);
                    if (stat && stat.isDirectory()) 
                        walk(file);
                    else if (file.endsWith(".magik") )
                    magikfiles.push(file);
                };
            };        

            walk(rootPath);

            // --- grab symbols from files and push to index
            for(var i in magikfiles){
                var urif = magikfiles[i]; 
                if ( swWorkspaceSymbols.index.indexOf(urif) < 0 ) {    
                    let openDocPromise = vscode.workspace.openTextDocument(urif);
                    openDocPromise.then(function(doc){
                        var symbols = this.get_magikSymbols(doc);
                        swWorkspaceSymbols.cache.push(symbols);    
                    swWorkspaceSymbols.index.push(urif);  
                    });       
                };       
            };
 
            // swWorkspaceSymbols.paths.push(rootPath);
        };

        let symInfos = [];
        for(var i in swWorkspaceSymbols.index)
            if (swWorkspaceSymbols.index[i].indexOf(rootPath) == 0)  
                symInfos = symInfos.concat(swWorkspaceSymbols.cache[i]);         

        return symInfos;
    };

    get_moduleSymbols(document, token) {
        var docUri = document.fileName;
        var symInfos = [];
    //     var n;
    //    if(docUri.endsWith("\product.def"))
    //        n=docUri.indexOf("\product.def");
    //     else if(docUri.endsWith("\module.def"))
    //        n=docUri.indexOf("\module.def");
    //     else
    //         return symInfos;

    //     var rootPath = docUri.slice(0,n-1);

    //     symInfos =  this.get_WorkspaceSymbols(rootPath, token)  
    for (var lineCount = 0; lineCount < document.lineCount; ++lineCount) {
        var lineText = document.lineAt(lineCount).text.split("#")[0];
        var tag = lineText.split("\t")[0].split(" ")[0];
        if ( tag.length == 0) continue;
        var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0));
        var symInfo = new vscode.SymbolInformation(tag, vsSK.Module, symRnge,docUri);
        symInfos.push(symInfo);
        break;
    };

    return symInfos  
    };

    get_magikSymbols(document, token) {
        var docUri = document.uri; //vscode.Uri.file(document.path);
        var symRef = [];
        var symRefIndex = [];
        var lastContainer = null;   
        var vsSymbols = this.parse_magikTags(document);
        for(var k in vsSymbols){
            var tag = vsSymbols[k]
            var parentName = tag.containerName;   
            var i;
            if (parentName == null) {
                if (symRef.indexOf(tag.nodeName) <0) {
                    symRef.push(tag.nodeName);
                    // symRefIndex.push( [tag.nodeName, tag.vsKind, tag.keyPosition, tag.endPosition] );
                };
                // continue;
            } else if (lastContainer==null || lastContainer[0]!=parentName){//( (i=symRef.indexOf(parentName)) < 0) {
                var p1 = tag.keyPosition;
                var i = Math.max(0,p1.line-1);
                p1 = new vscode.Position( i,0 );
                var tagRef = [parentName,vsSK.Class,p1,tag.endPosition,parentName];// + " " + i];
                 //   symRef.push(parentName);
                    symRefIndex.push(tagRef);
                    tag.parentNode = tagRef;
                    lastContainer = tagRef;
                    tag.parentNode = lastContainer;
                    parentName = lastContainer[4] 
            } else {
                // symRefIndex[i][3] = tag.endPosition;  
                lastContainer[3] = tag.endPosition; 
                tag.parentNode = lastContainer;
                parentName = lastContainer[4] 
            };
            var symRnge = new vscode.Range(tag.keyPosition, tag.endPosition);
            // var symInfo = new vscode.SymbolInformation(tag.nodeName, tag.vsKind, symRnge, docUri, parentName);
            var label = tag.nodeName; //+ " " + tag.keyPosition.line;
            var symInfo = new vscode.SymbolInformation(label, tag.vsKind, symRnge, docUri, parentName);
            vsSymbols[k] = symInfo;

        };
 
        for(var k in symRefIndex){
            var tagRef = symRefIndex[k]
            var symRefInfo = new vscode.SymbolInformation(tagRef[4], tagRef[1], new vscode.Range(tagRef[2],tagRef[3]),docUri );
            vsSymbols.push(symRefInfo); 
        };
        
        return vsSymbols;
    };

    get_gisSymbols(document, token) {
        var symRef = [];
        var parentName, methd, parms;
        var docUri = document.fileName;
        var symInfos = [];
        // parse the document for functions
        for (var lineCount = 0; lineCount < document.lineCount; ++lineCount) {
            var lineText = document.lineAt(lineCount).text;
            var tag = this.getTagText(lineText,":");
            if (tag == null) continue;
            if ((tag=tag.trim()).search(":") != tag.length-1) continue;
            if (tag.indexOf(" ")>-1) continue;
            var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0))
            var symInfo = new vscode.SymbolInformation(tag, vsSK.Interface, symRnge, null);// docUri);
            symInfos.push(symInfo);
        };
        return symInfos;
    };
              
    parse_magikTags(document) {
        var tags = [];
            // parse the document for symbols
        for (var lineCount = 0; lineCount < document.lineCount; ++lineCount) {
            var lineTextTags = this.parse_magikSyntax(document,lineCount);
            for (var i in lineTextTags){
                var tag = lineTextTags[i];

                // build node and container names    
                var parentName, methd, parms;
                var tagTxt = tag.text;
                var tagIdx= tagTxt.indexOf(tag.keyWord);
                switch (tag.keyWord) {
                    case '_method':
                    	parms = "";
                        tagTxt = tagTxt.slice(tagIdx + tag.keyWord.length);
                        var arr = tagTxt.split(".")
                        if (arr.length==1) {
                            arr = tagTxt.split("[")
                            if (arr.length==1)  methd = [""];
                            else methd = arr[1].split("]");
                            if (methd.length==1) methd = ["[]"];
                            else if (methd[1].indexOf("<<") >=0 ) methd = ["[]<<"];
                        } else methd = arr[1].split("(");
                        if (methd.length > 1) parms = "()"; //+methd[1].trim().replce(")",""); 
                        methd = methd[0].trim();
                        parentName = arr[0].trim();
                       break; 
                    case '_proc':
                        if (tagTxt.indexOf("<<") < 0){
                            var lastline = document.lineAt(tag.keyPosition.line-1).text;
                            if (lastline.indexOf("<<") >= 0) tagTxt = lastline + tagTxt;
                        } ;   
                    case '_block':
                        parentName = null;//tag.keyWord;
                        methd = tag.keyWord + " ";
                        if ((i = tagTxt.indexOf("<<")) > -1) {
                            var arr = tagTxt.slice(0,i).trim().split(" ");
                            methd += arr[arr.length-1].trim();
                        } else if (tagTxt.indexOf("@") > -1)
                            methd += "@"+tagTxt.slice(tagTxt.indexOf("@")).split("(")[0].trim();
                        else 
                            methd += "@unammed";
                        if (tagTxt.indexOf("(") > -1) 
                            parms = "()";    
                        break;    
                    case '_dynamic':
                    case '_global':
                        parentName =  null;//tag.keyWord;
                        methd = tag.keyWord+ " ";
                        var arr = tagTxt.split(tag.keyWord);
                        parms = arr[arr.length-1];
                        if ((i=parms.indexOf("<<")) > -1)            
                            parms = parms.slice(0,i).trim().split(" ")[0];
                        else  
                            parms = parms.trim();
                        break;    
                    case 'def_mixin':
                    case 'def_slotted_exemplar':
                        // for(var i = tag.keyPosition.line+1; tagTxt.indexOf(":") < 0;i++)
                        //     tagTxt += document.lineAt(i).text;
                        // var arr = tagTxt.split(")")[0].split(",")[0].split(":");
                        // parentName = arr[arr.length-1].trim();
                        parentName = tag.params[0].replace(':','');
                        methd = tag.keyWord;
                        parms = "";
                        break;                       
                    case 'condition.define_condition':
                    case 'smallworld_product.register_application':
                    case 'magik_session.register_new':
                        parentName = tag.keyWord.split(".")[0];               
                        // for(var i = tag.keyPosition._line+1; tagTxt.indexOf(",") < 0;i++)
                        // tagTxt += document.lineAt(i).text;
                        // var arr = tagTxt.split(":");
                        // arr = arr[arr.length-1].split("(");
                        // methd = arr[arr.length-1].split(",")[0].trim();
                        methd = tag.params[0].replace(':','');
                        parms = "";
                        break;    
                    case 'sw!patch_software':
                        parentName = null;
                        methd = tagTxt.trim();
                        parms = "";                 
                        break;    
                    default:
                        var arr = tagTxt.split(".")
                        parentName = arr[0].trim();
                        // for(var i = tag.keyPosition._line+1; tagTxt.indexOf(":") < 0;i++)
                        //     tagTxt += document.lineAt(i).text;
                        methd = tag.params[0].replace(':','');
                        parms = "";
                };
                tag.containerName = parentName;
                tag.nodeName = methd+parms;    
                tags.push(tag);
            }    
        }  
        return tags;  
    }

    parse_foldingRange(document, tag) {

        // return new FoldingRange(keyLine, endLine); //, FoldingRangeKind.Region);
    }

    magikKeys(){
        if (magikKeys == null) {
            magikKeys ="(";
            var index = [];
            for( var k in magikSymbols) {
                var ms =  magikSymbols[k];
                magikKeys +=   ms[0] + '|';
                index[ms[0]] = k;
                // ms[0] = new RegExp(ms[0]);
                // ms[1] = new RegExp(ms[1]);
            };
            magikKeys= magikKeys.slice(0,magikKeys.length-1) + ')';
            magikKeys = {
                regexp: new RegExp("\\b"+ magikKeys + "\\b" ,"ig"),
                index: index
        };
        };
        return  magikKeys;
    };

    getTagText(lineText, tagKey) {
        var tagIdx =  (tagKey == '\n')? 0 : lineText.indexOf(tagKey);
        if (tagIdx < 0) return;
 
        var tagTxt = this.trimComments(lineText);
//        var syntax = this.parse_magikLine(lineText) ;
        if (tagTxt.length < tagIdx) return;
        tagIdx = tagTxt.indexOf(tagKey);     
        if (tagKey[0]=="_" &&  tagIdx >= 0)   {            
             let str = RegExp ("\\b"+tagKey+"\\b");     
             tagIdx = lineText.search(str);
             if (this.testInString(tagIdx) )
                return;
        };           
     return tagTxt;   
    };         

    testInString(tagTxt,pos) {
        // var inString = false;
        // if (/[%"':]/.test(tagTxt)){
        //     this.magikStringPattern.forEach( function(ch){
        //         var n = tagTxt.length;
        //         var c = tagTxt.indexOf(ch[0]);
        //         if (c<0 || c > pos) return;
        //         c = c+ch[0].length; 
        //         while(c<n && ch[1].test(tagTxt[c])) ++c;
        //         if (pos < c) inString = true;
        //     }); 
        // }; 
        var n = tagTxt.length;
        for(var i=0; i<pos; i++){
            var ch = tagTxt[i];
            if (/[#"':]/.test(ch) == false) continue;
            if (ch=='#') return false;
            if (i>0 && tagTxt[i-1]=='%') continue;
            if (i+1<n && ch==':' && tagTxt[i+1]=='|') ch=":|";
            i = i + ch.length; 
            var strPttrn = this.magikStringPattern[ch];
            while(i<n && strPttrn.test(tagTxt[i])) ++i;
            if (i > pos) return true;
        }
        return false;
    }

    trimComments(tagTxt) {
        let match, regex = /#/ig;
        while (match = regex.exec(tagTxt)) 
            if(match.index == 0) 
                return "";
            else if (!this.testInString(tagTxt,match.index))
                return tagTxt.slice(0,match.index-1).trim();
        return tagTxt.trim();
    }
    
    parse_magikSyntax(document,keyLine) {
        var syntaxText = "";
        var doc_length =  document.lineCount; //document.length;
        for (var i=keyLine; i< doc_length; ++i) {
            syntaxText +=  this.trimComments(document.lineAt(i).text) //document[i];
            var ch = syntaxText[syntaxText.length-1];
             if (!/[(,]/.test(ch)) break;
        };

        var tagKeys = [];
        let match, keys = this.magikKeys(); 
        while ((match = keys.regexp.exec(syntaxText)) !== null) {
            var keyPos = match.index;
            if (this.testInString(syntaxText,keyPos)) continue;

            // check tag    
            var tagKey = keys.index[match[1].toLowerCase()];
            var mSymb = magikSymbols[tagKey];
            //var tagTxt = this.getTagText(syntaxText, mSymb[0]);
            //if (tagTxt==null) continue;
            var tagParams = this.parse_magikParams(syntaxText,keyPos+tagKey.length);
            var tagRange = this.parse_foldingRange(document, keyLine, keyPos, mSymb[0], mSymb[1]) 

            var tag = {
                text:        syntaxText, 
                key:         tagKey,
                range:       tagRange,
                keyWord:     mSymb[0], 
                endWord:     mSymb[1], 
                keyPosition: tagRange.start,
                endPosition: tagRange.end,
                parentNode:  null,
                containerName: null,
                nodeName:    null,   
                params :     tagParams,
                vsKind:      mSymb[2] 
            };

            tagKeys.push(tag);
        };
        return tagKeys;
    }           

    parse_foldingRange(document, keyLine, keyPos,keyWord,endWord) {
            // folding range    
            var nestedBrackets = 0;
            let closeBracket = /\)/ig;
            let openBracket = /\(/ig;
            if (endWord!=')'){
                closeBracket = new RegExp(  "\\b("+ endWord + ")\\b","ig"); 
                openBracket =  new RegExp( "\\b("+ keyWord + ")\\b" ,"ig"); 
            } ;
            var endLine = keyLine, endPos = 0;
            var doc_length =  document.lineCount; //document.length;
            for (; endLine< doc_length; ++endLine) {
                var lineText = this.trimComments(document.lineAt(endLine).text); //document[endLine];
                // var endPos = lineText.indexOf(closeBracket);
                // if ( this.testInString(lineText,endPos)) continue;
                        
                let match;
                while (match = closeBracket.exec(lineText)) 
                    if (!this.testInString(lineText,match.index)) nestedBrackets++;
                while (match = openBracket.exec(lineText)) 
                    if (!this.testInString(lineText,match.index)) nestedBrackets--;
                
                // if (this.getTagText(lineText,closeBracket) != null ) 
                // nestedBrackets -= Math.max(1,lineText.split(closeBracket).length-1);
                // if (this.getTagText(lineText,openBracket) != null ) 
                //     nestedBrackets += lineText.split(openBracket).length-1;
                if (nestedBrackets) continue;   

                // var endTag = this.getTagText(lineText, closeBracket);
                // if (endTag==null) continue; 
                else break;
            }; 
            keyPos = new vscode.Position(keyLine,keyPos),
            endPos = Math.max(endPos,0)+ closeBracket.length;
            endPos = new vscode.Position(endLine,endPos);
            var tagRnge = new vscode.Range(keyPos, endPos);

        return tagRnge   
    }
    parse_magikParams(syntaxText,keyPos) {
        // params
        var params = [], n = -1;
        var pCount = 0;
           for (var i= keyPos; i< syntaxText.length; ++i) {
                var ch = syntaxText[i];
                if (pCount) 
                    if (ch==',' && !this.testInString(syntaxText,i)) {params.push(""); n++}  
                    else if (ch==')' && !this.testInString(syntaxText,i))
                        if (--pCount) params[n] +=ch;
                        else break; 
                    else if (ch=='(' && !this.testInString(syntaxText,i)) {params[n]+=ch; pCount++} 
                    else params[n] +=ch;
                else if (ch ==')') --pCount;
                else if (ch =='('){params.push(""); n++; pCount++}  
            };
        return params
    }

    parse_magikLine(lineText) {

        var c,s;
        var syntax = [""];
        for(var i=0; i< lineText.length; ++i ){
            var s = lineText[i];
            if (s=='#'){
                s = lineText.slice(i, lineText.length-1);
                syntax.push(s);
                break;
            } else if (/[a-z!?_A-Z:]/.test(s)){
                while (/[a-z!?_A-Z0-9]/.test(c = lineText[++i])) s+=c;
                syntax.push(s);
            } else if (/[\+\-0-9]/.test(s)){
                while (/[eE.0-9]/.test(c = lineText[++i])) s+=c;
                syntax.push(s);
            } else if (/({|\"|\'|:\|)/.test(s)){
                [['{','}'],["'","'"],[":|","|"]].forEach( function(ch){
                    if (ch[0] != s) return;
                    while ((c = lineText[++i]) != ch[1]) s+=c;
                    s += ch[1];
                    syntax.push(s);
                }); 
                continue;
            } else if (/[+-,()[\]]/.test(s)){
                syntax.push(s);
            } else if (/\S/.test(s)){
                syntax.push(s);
            };   
            syntax[0] += s;
        };
        return syntax;
    }

}
exports.codeBrowser = codeBrowser    

