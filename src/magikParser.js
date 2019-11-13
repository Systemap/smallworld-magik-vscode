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
	package_class_dot_method: /([a-z_!?]+[\w_!?]*:)?[a-z_!?]+[\w_!?]*\s*\.\s*[a-z_!?]+[\w_!?]*\s*(\[\]|\(\)|<<|\[\]<<)?/i,
	class_dot_method: /[a-z_!?]+[\w_!?]*\s*\.\s*[a-z_!?]+[\w_!?]*\s*(\[|\(|<)?/i,
	class_dot_bare_method: /(\w+:)?[a-z_!?]+[\w_!?]*\s*\.\s*[a-z_!?]+[\w_!?]*/ig,
	class_dot:        /:?[a-z_!?]+[\w_!?]*\s*\./i,
	dot_method:       /\.\s*[\a-z!?]+[\w_!?]*\s*[\[\(<]?/i,
	variable:         /[a-z_!?]+[\w_!?]*/i,
	product_module_keyword:  /\b(title|description|optional|templates|end|requires|install_requires|requires_datamodel|hidden|version|condition_message_accessor|language|hiddencase_installation|style_installation|ace_installation|system_installation|auth_installation)\b/i,
	pseudo_defs: /\b(invoke|def_property|define_property|define_shared_constant|define_shared_variable|define_slot_access|define_pseudo_slot)\b/i,
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
	_global_index : ["^\\s-*_global\\(\n\\|\\s-\\)+\\(_constant\\(\n\\|\\s-\\)+\\)?\\(\\sw*\\(\\s$\\S$*\\s$\\sw*\\)?\\)"],
	_package : /_package\s+\w+/i,
    _block                 : /_block/i,
    _global                :  /_global/i,
    _global_constant       :  /_global\s+_constant/i,
    _constant              :  /_constant/i,
    _dynamic_import        : /_dynamic\s+_import/i,
    _dynamic               : /_dynamic/i,
    _import                : /_import/i,
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
    register_application   : /smallworld_product\s*\.\s*register_application/i,
    sw_patch_software      : /sw!patch_software/i
}
exports.keyPattern = keyPattern;

const magikSymbols = {
    _package               : ['_package',              '\n',         '\n', vsSK.Package,    '_package'],
    _global_constant       : ['_global\\s*_constant',  '_global',    '<<', vsSK.Variable,  '_constant'],
    _global                : ['_global',               '_global',    '<<', vsSK.Variable,  '_global'],
    _constant              : ['_constant',             '_constant',  '<<', vsSK.Constant,  '_constant'],
    _dynamic_import        : ['_dynamic\\s*_import',   '_dynamic',   '<<', vsSK.Variable,   '_dynamic'],
    _dynamic               : ['_dynamic',              '_dynamic',   '<<', vsSK.Variable,   '_dynamic'],
    _import                : ['_import',               '_import',   '<<', vsSK.Variable,    '_import'],
    _iter_proc             : ['_iter\\s+_proc',        '_endproc',   '()', vsSK.Function, '_proc'],
    _proc                  : ['_proc',                 '_endproc',   '()', vsSK.Function,  '_proc'],
    _block                 : ['_block',                '_endblock',    '', vsSK.Struct,    '_block'],
    _abstract_method       : ['_abstract\\s+_method',  '_endmethod', '()', vsSK.Method,    '_method'],
    _private_method        : ['_private\\s+_method',   '_endmethod', '()', vsSK.Method,    '_method'],
    _iter_method           : ['_iter\\s+_method',      '_endmethod', '()', vsSK.Method,    '_method'],
    _method                : ['_method',               '_endmethod', '()', vsSK.Method,    '_method'],
    def_mixin              : ['def_mixin',                     ')',  '()', vsSK.Property,  'def_mixin'], 
    def_slotted_exemplar   : ['def_slotted_exemplar',          ')', '()', vsSK.Property,  'def_slotted_exemplar'], 
    define_slot_access     : ['define_slot_access',            ')', '()', vsSK.Property,  'define_slot_access'], 
    define_pseudo_slot     : ['define_pseudo_slot',            ')', '()', vsSK.Property,  'define_pseudo_slot'], 
    define_property        : ['define_property',               ')', '()', vsSK.Property,  'define_property'], 
    def_property           : ['def_property' ,                 ')', '()', vsSK.Property,  'def_property'],
    define_shared_variable : ['define_shared_variable',        ')', '()', vsSK.Variable,  'define_shared_variable'], 
    define_shared_constant : ['define_shared_constant',        ')', '()', vsSK.Constant,  'define_shared_constant'], 
    define_condition       : ['condition\\s*.\\s*define_condition',    ')', '()', vsSK.Constant,    'condition'],
    register_new           : ['magik_session\\s*.\\s*register_new',    ')', '()', vsSK.Module,      'magik_session'],
    register_application   : ['smallworld_product\\s*.\\s*register_application', ')','()', vsSK.Module, 'application'],
    sw_patch_software      : ['sw!patch_software',           ')', '()', vsSK.Module,/sw!patch_software/i]
}
exports.magikSymbols = magikSymbols;

const magikKeywords = { 
	signature: /\b(abstract|allresults|and|andif|block|catch|clone|constant|continue|div|dynamic|elif|else|endblock|endcatch|endif|endlock|endloop|endmethod|endproc|endprotect|endtry|false|finally|for|gather|global|handling|if|import|is|isnt|iter|leave|local|lock|loop|loopbody|maybe|method|mod|no_way|not|optional|or|orif|over|package|pragma|private|proc|protect|locking|protection|recursive|return|scatter|self|super|then|thisthread|throw|true|try|unset|when|while|with|xor)[^\w!?]/ig,
	pattern:  /\b_(abstract|allresults|and|andif|block|catch|clone|constant|continue|div|dynamic|elif|else|endblock|endcatch|endif|endlock|endloop|endmethod|endproc|endprotect|endtry|false|finally|for|gather|global|handling|if|import|is|isnt|iter|leave|local|lock|loop|loopbody|maybe|method|mod|no_way|not|optional|or|orif|over|package|pragma|private|proc|protect|locking|protection|recursive|return|scatter|self|super|then|thisthread|throw|true|try|unset|when|while|with|xor)\b/i,
}
exports.magikKeywords = magikKeywords;

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
             if (isntActiveCode(lineText,tagIdx) )
                return;
        };           
     return tagTxt;   
}        
exports.getTagText = getTagText

function  isActiveCode(codeLine,pos) {
	let ci = codeLine.indexOf('#');
	let match;
	while (match = keyPattern.string_mask.exec(codeLine)) {
		var p1 = match.index;
		var p2 = p1 + match[0].length;
		if (pos<p1      ) break;
		else if (pos<p2 ) return false;
		else if (ci < 0 ) continue ;
		else if (ci < p1) return false;
		else if (ci < p2) ci = codeLine.indexOf('#',p2);   
	}
	return (ci <0 || ci >= pos);
}
exports.isActiveCode = isActiveCode;

function isntActiveCode(codeLine,pos) {
	let result = isActiveCode(codeLine,pos) ;
	return result == false;
}
exports.isntActiveCode = isntActiveCode;


function param0(tag) {
	let node = tag.params.match(/\([^,\)]+/);
	if (node) return node[0].replace(/[\(\"':\,\|\s]/g,'');
	else return '';
}
exports.param0 = param0;

function maskComments(tagTxt) {
	let match, regex = /(#|_pragma)/ig;
	while (match = regex.exec(tagTxt)) 
		if(match.index == 0 || isActiveCode(tagTxt,match.index))
			return tagTxt.slice(0,match.index)+' '.repeat(tagTxt.length-match.index);
	return tagTxt;
}
exports.maskComments = maskComments;

function trimComments(tagTxt) {
	return maskComments(tagTxt).trim();
}
exports.trimComments = trimComments;

function getSyntaxCode(lineText,keyPos) {
	// removes comments and extra spaces 
	var syntax = lineText.slice(0,keyPos).replace(/\s+/g,' ').trim()+' ';

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
	const blank = function(x) {return " ".repeat(x.length)};
	var syntax = lineText.replace(keyPattern.string_mask, blank  ).replace(/#.*/,blank);
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
	if (!range || range.isEmpty) 
		range = document.getWordRangeAtPosition(pos,keyPattern.dot_method);
	if (!range || range.isEmpty) 
		range = document.getWordRangeAtPosition(pos,keyPattern.class_dot);
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
	var codeLine = document.lineAt(pos.line).text ;
	codeLine = maskComments( document.lineAt(pos.line).text ) ;
	var codeWord = codeLine.slice(range.start.character,range.end.character);
	if(!codeWord) return;
	codeWord = document.getText(range);
	codeWord = codeWord.replace(magikKeywords.pattern,'');
	return codeWord.toLowerCase();
}
exports.getSymbolNameAtPosition = getSymbolNameAtPosition    

function getEnvironVarAtPosition(document, pos) {
	const symbolNamePattern =/([\w!?]+:\s?|[\w!?]+\s*=|%[\w!?]+%)/i;
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


function splitChevron(codeLine) {
	var arr =  maskStringComments(codeLine).split(/<</g);
	if (arr.length<2) {
		arr = null;
	} else {
		var s = 0;
		for (var i in arr){
			arr[i] = codeLine.slice(s,s+arr[i].length);
			s = arr[i].length + 2;
			arr[i] = arr[i].trim();
		}	
		s = arr[0].match(/[a-z_!?]+[\w!?]*/ig);
		arr[0] = s[s.length-1];
	}	
	return arr;
}
exports.splitChevron = splitChevron    
