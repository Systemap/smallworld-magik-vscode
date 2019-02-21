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
    _global                : ['_global',                 '\n', vsSK.Variable],
    _dynamic               : ['_dynamic',                '\n', vsSK.Variable],
    def_mixin              : ['def_mixin',               ')', vsSK.Property], 
    def_slotted_exemplar   : ['def_slotted_exemplar',    ')', vsSK.Property], 
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
             var lineText = document.lineAt(lineCount).text;
            var lineTextTags = this.getTagInfo(lineText);
            for (var i in lineTextTags){
                var tag = lineTextTags[i];
                var charCount = lineText.indexOf(tag.keyWord);
                tag.keyPosition = new vscode.Position(lineCount,charCount);
                //    tag.foldingRange = this.parse_foldingRange(document,tag);   
                var endline = this.parse_foldingRange(document,tag);   
                charCount = document.lineAt(endline).text.length;
               tag.endPosition = new vscode.Position(endline,charCount);

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
                        for(var i = tag.keyPosition.line+1; tagTxt.indexOf(":") < 0;i++)
                            tagTxt += document.lineAt(i).text;
                        var arr = tagTxt.split(")")[0].split(",")[0].split(":");
                        parentName = arr[arr.length-1].trim();
                        methd = tag.keyWord;
                        parms = "";
                        break;                       
                    case 'condition.define_condition':
                    case 'smallworld_product.register_application':
                    case 'magik_session.register_new':
                        parentName = tag.keyWord.split(".")[0];               
                        for(var i = tag.keyPosition._line+1; tagTxt.indexOf(",") < 0;i++)
                        tagTxt += document.lineAt(i).text;
                        var arr = tagTxt.split(":");
                        arr = arr[arr.length-1].split("(");
                        methd = arr[arr.length-1].split(",")[0].trim();
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
                        for(var i = tag.keyPosition._line+1; tagTxt.indexOf(":") < 0;i++)
                            tagTxt += document.lineAt(i).text;
                        methd = tagTxt.split(":")[1].split(",")[0].trim();
                        parms = "";
                };
                tag.containerName = parentName;
                tag.nodeName = methd+parms;    
                tags.push(tag);
            }    
        }  
        return tags;  
    }

    parse_foldingRange(document,tag) {
        var start_line = tag.keyPosition.line;
        var closeBracket =tag.endWord;
        var openBracket = (closeBracket=='(')?-1:0;
        var nestedBrackets = (openBracket==')')?'(':tag.keyWord;;     
        var end_line = start_line;
        var doc_length =  document.lineCount; //document.length;
        for (; end_line< doc_length; ++end_line) {
            var lineText =  document.lineAt(end_line).text; //document[end_line];
            if (this.getTagText(lineText,closeBracket) != null ) 
                nestedBrackets -= Math.max(1,lineText.split(closeBracket).length-1);
            if (this.getTagText(lineText,openBracket) != null ) 
                nestedBrackets += lineText.split(openBracket).length-1;
            if (nestedBrackets) continue;        
            var endTag = this.getTagText(lineText, tag.endWord);
            if (endTag==null) continue; else break;
        }   
        // return new FoldingRange(start_line, end_line); //, FoldingRangeKind.Region);
        return end_line;
    }

    magikKeys(){
        if (magikKeys == null) {
            magikKeys ="(";
            for( var k in magikSymbols) {
                var ms =  magikSymbols[k];
                magikKeys +=   k + '|';
                // ms[0] = new RegExp(ms[0]);
                // ms[1] = new RegExp(ms[1]);
            };
            magikKeys= magikKeys.slice(0,magikKeys.length-1) + ')';
            magikKeys = new RegExp("\\b"+ magikKeys + "\\b" ,"ig");
        } 
        return  magikKeys;
    };
    
    getTagText(lineText, tagKey) {
        var tagIdx =  (tagKey == '\n')? 0 : lineText.indexOf(tagKey);
        if (tagIdx < 0) return;
 
        var tagTxt = lineText.split('#')[0].trim();
        if (tagTxt.length < tagIdx) return;
        for (var i in [1,2])            
        for (var ch = ['"',"'"][i];;){
             var rem = tagTxt.indexOf(ch)
             if (rem<0 || rem > tagIdx) 
                 break;
//            tagTxt = tagTxt.slice(0,rem-1);
            tagTxt = tagTxt.slice(rem+1,tagTxt.length);
            tagIdx = tagTxt.indexOf(tagKey);
            rem = tagTxt.indexOf(ch); 
             if (tagIdx < 0 || rem > tagIdx) 
                 return;
            tagTxt = tagTxt.slice(rem+1,tagTxt.length);
        };     
        tagIdx = tagTxt.indexOf(tagKey);     
        rem =  tagTxt.length - (tagIdx+tagKey.length);
        if (tagKey[0]=="_" &&  rem > 0)   {            
             let str = RegExp ("\\b"+tagKey+"\\b");     
             tagIdx = lineText.search(str);
             if (tagIdx<0) 
                 return;
        };           
     return tagTxt;   
    };         

    getTagInfo(lineText) {
        var tagKeys = [];
        let tagKey = null;
        var keys = this.magikKeys();
        while ((tagKey = keys.exec(lineText)) !== null) {
                tagKey = tagKey[1].toLowerCase();
                var tag = magikSymbols[tagKey];
                var tagTxt = this.getTagText(lineText, tag[0]);
                if (tagTxt==null || tag==undefined) continue;
                tagKeys.push({
                    text:    tagTxt, 
                    key: tagKey,
                    keyWord: tag[0], 
                    endWord: tag[1], 
                    keyPosition: null,
                    endPosition: null,
                    parentNode: null,
                    containerName: null,
                    nodeName: null,   
                    vsKind:  tag[2] 
                });
         };
        return tagKeys;
    };           
  
}
exports.codeBrowser = codeBrowser    
