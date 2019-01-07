'use strict';
const vscode = require('vscode');
const fs=require("fs");
const vsSK = vscode.SymbolKind;
var magikKeys=null;// = /(_method|_proc|_block|_global|def_slotted_exemplar|sw!patch_software|define_shared_variable|define_shared_constant|define_property|def_property|register_new|register_application)/ig;

const magikSymbols = {
    _method                  : ['_method','_endmethod',vsSK.Method],
    _proc                    : [ '_proc','_endproc', vsSK.Function],
    _block                   : ['_block','_endblock',vsSK.Function],
    _global                  : ['_global','\n', vsSK.Variable],
    'def_slotted_exemplar'   : ['def_slotted_exemplar',   ')', vsSK.Property], 
    'sw!patch_software'      : ['sw!patch_software',      ')', vsSK.Module],
    'define_shared_variable' : ['define_shared_variable', ')', vsSK.Variable], 
    'define_shared_constant' : ['define_property',        ')', vsSK.Constant], 
    'define_property'        : ['define_property',        ')', vsSK.Property], 
    'def_property'           : ['def_property' ,          ')', vsSK.Property],
    'register_new'           : ['magik_session.register_new' ,  ')', vsSK.Module],
    'register_application'   : ['smallworld_product.register_application' ,  ')', vsSK.Module]
};

const swWorkspaceSymbols = {index: [], cache: [], paths: []};

class codeBrowser{

    provideWorkspaceSymbols(query, token) {
        let rootPath = vscode.workspace.rootPath;
        if (vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)) {
            rootPath = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri).uri.fsPath;
        };
        let swConfig = vscode.workspace.getConfiguration('magik', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
        if (!rootPath && !swConfig.gotoSymbol.includeGoroot) {
            vscode.window.showInformationMessage('No workspace is open to find symbols.');
            return;
        };
       // --- grab symbols from files and push to index
        var grab =  function (err, magikfiles,rootPath) { 
            console.log("---done "+ magikfiles.length + " " + rootPath )
            if (err) return ;
            magikfiles.forEach(function(fname) {
                if ( swWorkspaceSymbols.index.indexOf(fname) < 0 ) {    
                    let urif = fname; // vscode.file(fname)//  URI.file(fname);
                    let openDocPromise = vscode.workspace.openTextDocument(urif);
                    openDocPromise.then(function(doc){
                        var symbolProvider =  new cBrowser.codeBrowser();
                        var symbols = symbolProvider.provideDocumentSymbols(doc);
                        swWorkspaceSymbols.cache.push(symbols);    
                        swWorkspaceSymbols.index.push(fname);  
                    }); 
                };       
            });
            swWorkspaceSymbols.paths.push(rootPath);
        };
        // --- walk thru the folders for .magik files
        var walk = function(dir, done) {
            var results = [];
            fs.readdir(dir, function(err, list) {
                if (err) return done(err);
        // console.log("---walk "+dir)
                var i = 0;
                (function next() {
                    var file = list[i++];
                    if (!file) return done(null, results,dir);
                    file = dir + '/' + file;
                    fs.stat(file, function(err, stat) {
                        if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            next();
                        });
                        } else {
                            var fn = file.substr(-6);
                            if(fn==".magik") results.push(file);
                        next();
                        }
                    });
                })();
            });
        };        

        // --- sift the symbols for 'query'
        var sift = function(symbolCache,filter) {
            let list = [];
            var n;
            for (n in symbolCache) {
                symbolCache[n].forEach(function(symb){
                    if(filter=='' || symb.name.indexOf(filter)>=0)
                        list.push(symb);
                });      
            };      
            return list;      
       };    

        if (swWorkspaceSymbols.paths.indexOf(rootPath)<0) {
            walk(rootPath, grab);    
        };

        return sift(swWorkspaceSymbols.cache,query); 
    }

    provideDocumentSymbols(document, token) {
        var fname = document.fileName;
        var symInfos;
        var n = fname.search("gis_aliases");
        if (n != null && fname.slice(n)=="gis_aliases")
            symInfos = this.get_gisSymbols(document, token);
        else
            symInfos = this.get_magikSymbols(document, token);
        var i = swWorkspaceSymbols.index.indexOf(fname);
        if (  i < 0 ) {    
            swWorkspaceSymbols.cache.push(symInfos);    
            swWorkspaceSymbols.index.push(fname);  
        } else swWorkspaceSymbols.cache[i] = symInfos;         

        return  symInfos;   
    }
              
    get_gisSymbols(document, token) {
        var symRef = [];
        var parentName, methd, parms;
        var docUri = document.fileName;
        var symInfos = [];

        // parse the document for functions
        for (var lineCount = 0; lineCount < document.lineCount; ++lineCount) {
            var docuLine = document.lineAt(lineCount);
            var lineText = docuLine.text;
            var tag = this.getTagText(lineText,":");
            if (tag == null) continue;
            if ((tag=tag.trim()).search(":") != tag.length-1) continue;
            if (tag.indexOf(" ")>-1) continue;
            var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0))
            var symInfo = new vscode.SymbolInformation(tag, vsSK.Interface, symRnge, null);// docUri);
            symInfos.push(symInfo);
        };
        return symInfos;
    }
              
    find_magikTags(document) {
        var tags = [];
            // parse the document for symbols
        for (var lineCount = 0; lineCount < document.lineCount; ++lineCount) {
             var lineText = document.lineAt(lineCount).text;
            var lineTextTags = this.getTagInfo(lineText);
            for (var i in lineTextTags){
                var tag = lineTextTags[i];
                tag.keyPosition = new vscode.Position(lineCount,0);
                var nestedBrackets = 0;     
                var closeBracket =tag.endWord;
                var openBracket = (closeBracket==')')?'(':tag.keyWord;
                var n = lineCount;
                for (; n< document.lineCount ; ++n) {
                    lineText = document.lineAt(n).text;
                    if (this.getTagText(lineText,closeBracket) != null ) 
                        nestedBrackets -= Math.max(1,lineText.split(closeBracket).length-1);
                    if (this.getTagText(lineText,openBracket) != null ) 
                        nestedBrackets += lineText.split(openBracket).length-1;
                    if (nestedBrackets) continue;        
                    var endTag = this.getTagText(lineText, tag.endWord);
                    if (endTag==null) continue; else break;
                }    
                tag.endPosition = new vscode.Position(n,lineText.length);
                // build node and container names    
                var parentName, methd, parms;
                var tagTxt = tag.text;
                var tagIdx= tagTxt.indexOf(tag.keyWord);
                switch (tag.keyWord) {
                    case '_method':
                        tagTxt = tagTxt.slice(tagIdx + tag.keyWord.length);
                        var arr = tagTxt.split(".")
                       parentName = arr[0].trim();
                        methd = arr[1].split("(");
                        parms = "";
                        if (methd.length > 1) parms = "()"; //+methd[1].trim().replce(")",""); 
                        methd = methd[0].trim();
                       break; 
                    case '_proc':
                    case '_block':
                        parentName = tag.keyWord;
                        methd = parentName+" ";
                        if ((i = tagTxt.indexOf("<<")) > -1) {
                            var arr = tagTxt.slice(0,i).trim().split(" ");
                            methd += arr[arr.length-1].trim();
                        } ;     
                        if (tagTxt.indexOf("@") > -1)
                            methd += " "+tagTxt.slice(tagTxt.indexOf("@")).split("(")[0].trim();
                        else 
                            continue;    
                        if (tagTxt.indexOf("(") > -1) 
                            parms = "()";    
                        else 
                        continue;    // parms = "";   
                                          
                        break;    
                    case '_global':
                        parentName = tag.keyWord;
                        methd = "_global ";
                        var arr = tagTxt.split("<<");
                        if ((i=tagTxt.indexOf("<<")) > -1)            
                            methd += tagTxt.slice(0,i).trim().split(" ")[1].trim();
                        else  
                            methd += tagTxt.trim();
                        parms = "";                 
                        break;    
                    case 'def_slotted_exemplar':
                        for(var i = tag.keyPosition._line+1; tagTxt.indexOf(",") < 0;i++)
                        tagTxt += document.lineAt(i).text;
                        var arr = tagTxt.split(":");
                        arr = arr[arr.length-1].split("(");
                        methd = tag.keyWord
                        parentName = arr[arr.length-1].split(",")[0].trim();
                        parms = "";
                        break;                       
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

    get_magikSymbols(document, token) {
        var docUri = document.uri; //vscode.Uri.file(document.path);
        var symRef = [];
        var symRefIndex = [];
        var lastContainer = null;   
        var vsSymbols = this.find_magikTags(document);
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
                i = p1.line-1;
                var tagRef = [parentName,vsSK.Class,new vscode.Position(i, 0),tag.endPosition,parentName + " " + i];
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
            magikKeys +=  "null)";
            magikKeys = new RegExp("\\b"+ magikKeys + "\\b" ,"ig");
        } 
        return  magikKeys;
    };
    
    getTagText(lineText, tagKey) {
        var tagIdx =  (tagKey == '\n')? 0 : lineText.indexOf(tagKey);
        if (tagIdx < 0) return;
 
        var tagTxt = lineText;
        var commentIdx = lineText.indexOf('#');
        if (commentIdx > -1 )
             if (commentIdx < tagIdx) 
                  return;
             else 
                 tagTxt = tagTxt.slice(0,commentIdx-1).trim();
 
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
             let str = RegExp (tagKey+"[\\s()]");     
             tagIdx = lineText.search(str);
             if (tagIdx<0) 
                 return;
        }           
     return tagTxt;   
    }          

    getTagInfo(lineText) {
        var tagKeys = [];
        let tagKey = null;
        var keys = this.magikKeys();
        while ((tagKey = keys.exec(lineText)) !== null) {
                tagKey = tagKey[1];
                var tagTxt = this.getTagText(lineText,tagKey);
                var tag = magikSymbols[tagKey]
                if (tagTxt==null) continue;
                tagKeys.push({
                    text:    tagTxt, 
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

