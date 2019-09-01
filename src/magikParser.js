// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
const vscode = require('vscode');
const vsSK = vscode.SymbolKind;
const magikTagKeys={
	regexp: null,
	index: null
};

const keyPattern = {
	class_dot_method: /[a-z_!?]+[\w_!?]*\s*\.\s*[a-z_!?]+[\w_!?]*\s*(\[|\(|<)?/i,
	class_dot_bare_method: /(\w+:)?[a-z_!?]+[\w_!?]*\s*\.\s*[a-z_!?]+[\w_!?]*/ig,
	class_dot:        /:?[a-z_!?]+[\w_!?]*\s*\./i,
	dot_method:       /\.\s*[\a-z!?]+[\w_!?]*\s*[\[\(<]?/i,
	variable:         /[a-z_!?]+[\w_!?]*/i,
	product_module_keyword:  /\b(title|description|optional|templates|end|requires|install_requires|requires_datamodel|hidden|version|condition_message_accessor|language|hiddencase_installation|style_installation|ace_installation|system_installation|auth_installation)\b/i,
	methodsToIgnore: /\b(invoke|def_property|define_property|define_shared_constant|define_shared_variable|define_slot_access|define_pseudo_slot)\b/i,
	string_mask:     /(""|".*"|'.*'|:\|.*\||:[a-zA-Z_!?][\w_!?]*|:[a-zA-Z_!?][\w_!?]*\|.*\||%space|%tab|%newline|%.)/g,
	string_index:  { '"':/[^"]/, "'":/[^']/, ":|": /[^|]/, ":":/[a-z!?_A-Z0-9]/, "%":/(%\.|%space|%tab|%newline)/},
	_abstract_method: /_abstract\s*(_private)?\s*(_iter)?\s+_method\s+/i,
	_private_method:  /_private\s*(_iter)?\s+_method\s+/i,
	_iter_method:     /_iter\s+_method\s+/i,
	_method:          /_method\s+/i,
	_method_index: ["^\\s-*\\(_abstract\\(\n\\|\\s-\\)+\\)?\\(_private\\(\n\\|\\s-\\)+\\)?\\(_iter\\(\n\\|\\s-\\)+\\)?_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)\\)",
		"^\\s-*_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
   		"^\\s-*\\(_abstract\\(\n\\|\\s-\\)+\\)?\\(_private\\(\n\\|\\s-\\)+\\)?_iter\\(\n\\|\\s-\\)+_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"^\\s-*_private\\(\n\\|\\s-\\)+\\(_iter\\(\n\\|\\s-\\)+\\)?_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"^\\s-*_abstract\\(\n\\|\\s-\\)+\\(_private\\(\n\\|\\s-\\)+\\)?\\(_iter\\(\n\\|\\s-\\)+\\)?_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\(show\\|write\\|print\\|debug_print\\|trace\\)\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\.\\(new\\|init\\)\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"^\\s-*_method\\s-+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)\\s-*?\\["],
	_iter_proc:     /_iter\s+_proc\s*/i,
	_proc:          /_proc\s*/i,
	_proc_index:	["\\b_\\sw+\\(\n\\|\\s-\\)+\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)\\s-*<<\\(\n\\|\\s-\\)*_proc\\s-*(",
		"_proc\\s-*\\(@\\s-*\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)\\s-*("],
	condition: ["^\\s-*condition.define_condition([ \t\n]*:\\s-*\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	property:  ["^\\s-*\\(.+\\)\.def\\(\\|ine\\)_property([ \t\n]*:\\s-*\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	shared_variable:[ "^\\s-*\\(.+\\)\.define_shared_variable([ \t\n]*:\\s-*\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	shared_constants:  ["^\\s-*\\(.+\\)\.define_shared_constant([ \t\n]*:\\s-*\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	def: ["^\\s-*\\(.+\\)\.define_slot_access([ \t\n]*:\\s-*\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"^\\s-*\\(.+\\)\.define_pseudo_slot([ \t\n]*:\\s-*\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"^\\s-*def_mixin([ \t\n]*:\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		"^\\s-*define_binary_operator_case([ \t\n]*:\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)",
		 "^\\s-*def_slotted_exemplar([ \t\n]*:\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	_global : ["^\\s-*_global\\(\n\\|\\s-\\)+\\(_constant\\(\n\\|\\s-\\)+\\)?\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	_package : /_package\s+\w+/i,
    _block                 : /_block/i,
    _constant              :  /_constant/i,
    _dynamic               : /_dynamic/i,
    def_mixin              :  /def_mixin/i, 
    def_slotted_exemplar   : /def_slotted_exemplar/i, 
    define_slot_access     : /define_slot_access/i, 
    define_pseudo_slot     : /define_pseudo_slot/i, 
    define_property        : /define_property/i, 
    def_property           : /def_property/i,
    define_shared_variable : /define_shared_variable/i, 
    define_shared_constant : /define_shared_constant/i, 
    define_condition       : /condition\s*\.\s*define_condition/i,
    register_session       : /magik_session.register_new/i,
    register_application   : /smallworld_product\s*\.\*register_application/i,
    sw_patch_software      : /sw!patch_software/i
}
exports.keyPattern = keyPattern;

const magikSymbols = {
    _package               : ['_package',            '\n', '\n', vsSK.Package, keyPattern._package],
    _iter_proc             : ['_iter\\s+_proc',       '_endproc', '()', vsSK.Function,  keyPattern._iter_proc],
    _proc                  : ['_proc',               '_endproc',  '()', vsSK.Function,  /_iter\\s+_proc/i],
    _block                 : ['_block',              '_endblock',   '', vsSK.Struct,    /_proc/i],
    _global                : ['_global',               '_global', '<<', vsSK.Variable,  /_block/i],
    _constant              : ['_constant',           '_constant', '<<', vsSK.Constant,  /_constant/i],
    _dynamic               : ['_dynamic',             '_dynamic', '<<', vsSK.Variable,  /_dynamic/i],
    _abstract_method       : ['_abstract',          '_endmethod', '()', vsSK.Method,    keyPattern._abstract_method],
    _private_method        : ['_private',           '_endmethod', '()', vsSK.Method,    keyPattern._private_method],
    _iter_method           : ['_iter',              '_endmethod', '()', vsSK.Method,    keyPattern._iter_method],
    _method                : ['_method',            '_endmethod', '()', vsSK.Method,    /_method/i],
    def_mixin              : ['def_mixin',                   ')', '()', vsSK.Property,  /def_mixin/i], 
    def_slotted_exemplar   : ['def_slotted_exemplar',        ')', '()', vsSK.Property,  /def_slotted_exemplar/i], 
    define_slot_access     : ['define_slot_access',          ')', '()', vsSK.Property,  /define_slot_access/i], 
    define_pseudo_slot     : ['define_pseudo_slot',          ')', '()', vsSK.Property,  /define_pseudo_slot/i], 
    define_property        : ['define_property',             ')', '()', vsSK.Property,  /define_property/i], 
    def_property           : ['def_property' ,               ')', '()', vsSK.Property,  /def_property/i],
    define_shared_variable : ['define_shared_variable',      ')', '()', vsSK.Variable,  /define_shared_variable/i], 
    define_shared_constant : ['define_shared_constant',      ')', '()', vsSK.Constant,  /define_shared_constant/], 
    condition              : ['condition.define_condition',  ')', '()', vsSK.Constant,    /condition/],
    magik_session          : ['magik_session.register_new',  ')', '()', vsSK.Module,      /register_new/],
    application            : ['smallworld_product.register_application', ')','()', vsSK.Module,/smallworld_product\.register_application/i],
    sw_patch_software      : ['sw!patch_software',           ')', '()', vsSK.Module,'sw!patch_software']
}
exports.magikSymbols = magikSymbols;

function magikKeys(){
	if (!magikTagKeys.index) {
		var mKeys ="(";
		var index = [];
		for( var k in magikSymbols) {
			var ms =  magikSymbols[k];
			mKeys +=   ms[0] + '|';
			index[ms[0]] = k;
			// ms[0] = new RegExp(ms[0]);
			// ms[1] = new RegExp(ms[1]);
		};
		mKeys= mKeys.slice(0,mKeys.length-1) + ')';
		magikTagKeys.regexp= new RegExp("\\b"+ mKeys + "\\b" ,"ig");
		magikTagKeys.index = index;
	}
	return magikTagKeys;
}
exports.magikKeys = magikKeys ;

function  getTagText(lineText, tagKey) {
        var tagIdx =  (tagKey == '\n')? 0 : lineText.indexOf(tagKey);
        if (tagIdx < 0) return;
 
        var tagTxt = trimComments(lineText);
        if (tagTxt.length < tagIdx) return;
        tagIdx = tagTxt.indexOf(tagKey);     
        if (tagKey[0]=="_" &&  tagIdx >= 0)   {            
             let str = RegExp ("\\b"+tagKey+"\\b");     
             tagIdx = lineText.search(str);
             if (testInString(tagIdx) )
                return;
        };           
     return tagTxt;   
}        
exports.getTagText = getTagText

function  testInString(tagTxt,pos,inComment) {
	var n = tagTxt.length;
	for(var i=0; i<pos; i++){
		var ch = tagTxt[i];
		if (/[#"':]/.test(ch) == false) continue;
		if (ch=='#') return inComment==true;
		if (i>0 && tagTxt[i-1]=='%') continue;
		if (i+1<n && ch==':' && tagTxt[i+1]=='|') ch=":|";
		i = i + ch.length; 
		var strPttrn = keyPattern.string_index[ch];
		while(i<n && strPttrn.test(tagTxt[i])) ++i;
		if (i > pos) return true;
	}
	return false;
}
exports.testInString = testInString;

function trimComments(tagTxt) {
	let match, regex = /#/ig;
	while (match = regex.exec(tagTxt)) 
		if(match.index == 0) 
			return "";
		else if (!testInString(tagTxt,match.index))
			return tagTxt.slice(0,match.index-1).trim();
	return tagTxt.trim();
}
exports.trimComments = trimComments;

function getSyntaxCode(lineText,keyPos) {
	// removes comments and extra spaces 
	var syntax = lineText.slice(0,keyPos).replace(/\s+/g,' ');

	for(var i=keyPos; i< lineText.length; ++i ){
		var s = lineText[i];
		if (s=='#'){
			break;
		} else if (/\s/.test(s)){
		 	continue;
	   } else if (/["'|]/.test(s)){
			['\"','\'','|'].forEach( function(ch){
				if (ch != s) return;
				while ( ++i < lineText.length  && lineText[i] != ch) s+=lineText[i];
				s += ch;
				syntax += s;
			}); 
			continue;
		} else {
			syntax += s;
		};   
		
	};
	return syntax;
}
exports.getSyntaxCode = getSyntaxCode    

function maskStringComments(lineText) {
	// removes comments and masks strings with dash
	var syntax = lineText.replace(keyPattern.string_mask,' ').replace(/#.*/,' ');
	return syntax;
}
exports.maskStringComments = maskStringComments    

function proofMethodName(partialName) {
	
	partialName = partialName.replace(/\s/g,'').split(".");
	partialName = partialName[partialName.length-1].toLowerCase()
	if (partialName.endsWith('<'))
		 	partialName += '<';
		 else if (partialName.endsWith('('))
			 partialName += ')';
		 else if (partialName.endsWith('['))
			 partialName += ']';
	return partialName;
}
exports.proofMethodName = proofMethodName    

function getClassMethodAtPosition(document, pos) {

	var range = document.getWordRangeAtPosition(pos,keyPattern.class_dot_method);
	 if (!range || range.isEmpty) return;
	var codeLine = maskStringComments( document.lineAt(pos.line).text ) ;
	var codeWord = codeLine.slice(range.start.character,range.end.character);
		codeWord = codeWord.replace(/\s/g,'').split(".");
	if (codeWord.length>1){
		codeWord[0] = codeWord[0].toLowerCase();
		codeWord[1] = proofMethodName(codeWord[1]);
		var onClass = document.getWordRangeAtPosition(pos, keyPattern.class_dot);
		codeWord[2] =  (onClass)? codeWord[0] : codeWord[1].trim().split(/[\(\[]/)[0]; 
		return codeWord;
	}	
}
exports.getClassMethodAtPosition = getClassMethodAtPosition    

function getSymbolNameAtPosition(document, pos) {
	// const symbolNamePattern =/\b(register_new\s*\(|register_application\s*\(|session\s*=[a-z!?_]:[\w!?])/i;
	const symbolNamePattern = keyPattern.variable;
	var range = document.getWordRangeAtPosition(pos,symbolNamePattern);
	 if (!range || range.isEmpty) return;
	 var codeWord = document.getText(range);
	// var codeLine = document.getLine(pos.line); .replace(/\s/g,'');
	// var rx = new RegExp (codeWord+"\s*[\\(\\[]")
	//  if (rx.test(codeWord)) {
	// 	codeWord[2] = codeWord[1].replace(/\s/g,'').toLowerCase()
	//  }
	return codeWord;
}
exports.getSymbolNameAtPosition = getSymbolNameAtPosition    

function getEnvironVarAtPosition(document, pos) {
	const symbolNamePattern =/([\w_\d-!?]+:\s?|[\w\d!?_]\s*=|%[\w\d!?_]%)/i;
	var range = document.getWordRangeAtPosition(pos,symbolNamePattern);
	 if (!range || range.isEmpty) return;
	 var codeWord = document.getText(range).replace(/\s/g,'').split(/[=%]/);
	 if (codeWord.length == 2) {
		codeWord[2] = codeWord[0].replace(/\s/g,'').toLowerCase()
		return codeWord;
	 }
}
exports.getEnvironVarAtPosition = getEnvironVarAtPosition    

function get_ProductModuleName(document) {
	for (var i=0 ; i < document.lineCount; ++i){
		var p2 = document.lineAt(i).text.trim().split(/[#\s]/)[0]
		if (keyPattern.product_module_keyword.test(p2)) return;
		if (p2!="") return p2;
	}
}
exports.get_ProductModuleName = get_ProductModuleName    

