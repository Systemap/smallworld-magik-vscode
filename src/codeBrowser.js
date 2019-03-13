// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
const vscode = require('vscode');
const fs=require("fs");
const magikParser = require('./magikParser');

class codeBrowser{
    constructor(swgis) {
        this.swWorkspaceSymbols = swgis.swWorkspaceSymbols;
        this.swgis = swgis;
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

        const swWorkspaceSymbols = this.swWorkspaceSymbols;
        var i = this.swWorkspaceSymbols.index.indexOf(docUri);
        if (  i < 0 ) {    
            swWorkspaceSymbols.cache.push(symInfos);    
            swWorkspaceSymbols.index.push(docUri);  
        } else 
            swWorkspaceSymbols.cache[i] = symInfos;         

        return  symInfos;   
    };

    get_WorkspaceSymbols(rootPath, token) {

        const swWorkspaceSymbols = this.swWorkspaceSymbols;

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
        var symInfo = new vscode.SymbolInformation(tag, vscode.SymbolKind.Module, symRnge,docUri);
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
                var tagRef = [parentName,vscode.SymbolKind.Class,p1,tag.endPosition,parentName];// + " " + i];
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
            var tag = magikParser.getTagText(lineText,":");
            if (tag == null) continue;
            if ((tag=tag.trim()).search(":") != tag.length-1) continue;
            if (tag.indexOf(" ")>-1) continue;
            var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0))
            var symInfo = new vscode.SymbolInformation(tag, vscode.SymbolKind.Interface, symRnge, null);// docUri);
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
                try {
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
                        case '_constant':
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
                } catch(err) {}
            }    
        }  
        return tags;  
    }

    parse_magikSyntax(document,keyLine) {
        var doc_length =  document.lineCount; //document.length;
        var lineText = document.lineAt(keyLine).text;
        var tagKeys = [];
        let match, keys = magikParser.magikKeys(); 
        while ((match = keys.regexp.exec(lineText)) !== null) {
            var keyPos = match.index;
            if (magikParser.testInString(lineText,keyPos,true)) continue;
            
            var syntaxText ="" ;
            for (var i=keyLine; i< doc_length; ++i) {
                syntaxText +=  magikParser.trimComments(document.lineAt(i).text) //document[i];
                var ch = syntaxText[syntaxText.length-1];
                if (!/[(,]/.test(ch)) break;
            };

            // check tag    
            var tagKey = keys.index[match[1].toLowerCase()];
            var mSymb = magikParser.magikSymbols[tagKey];
            var tagParams = magikParser.get_SyntaxArguments(syntaxText,keyPos+tagKey.length,mSymb[1],mSymb[2]);
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
                var lineText = magikParser.trimComments(document.lineAt(endLine).text); //document[endLine];
                // var endPos = lineText.indexOf(closeBracket);
                // if ( this.testInString(lineText,endPos)) continue;
                        
                let match;
                while (match = closeBracket.exec(lineText)) 
                    if (!magikParser.testInString(lineText,match.index)) nestedBrackets++;
                while (match = openBracket.exec(lineText)) 
                    if (!magikParser.testInString(lineText,match.index)) nestedBrackets--;
                if (nestedBrackets) continue;   
                else break;
            }; 
            keyPos = new vscode.Position(keyLine,keyPos),
            endPos = Math.max(endPos,0)+ closeBracket.length;
            endPos = new vscode.Position(endLine,endPos);
            var tagRnge = new vscode.Range(keyPos, endPos);

        return tagRnge   
    }
}
exports.codeBrowser = codeBrowser    

