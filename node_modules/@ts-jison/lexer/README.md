@ts-jison/lexer:
====
-----------------------------------------
A parser run-time library used by [@ts-jison/parser-generator](../parser-generator).

This has been factored from Zach Carter <zach@carter.name>'s [jison-lex module](https://www.npmjs.com/package/jison-lex).

Installation
------------
You probably don't need to install this file as it is included as a dependency in the ouput of [@ts-jison/parser-generator](../parser-generator) and [@ts-jison/lexer-generator](../lexer-generator).

Status:
=====

This works (I'm using it in a few javascript and typescritp projects) and runs the original tests. If you want to geek about this, ping ericP on discord or ericprud on gitter.

* [issues](http://github.com/ericprud/ts-jison/issues)

<!-- [![build status](https://travis-ci.org/zaach/jison.svg)](http://travis-ci.org/zaach/jison) -->

Components:
=====
* [parser-generator](../parser-generator) - A lightly-typescriptified version of jison
* [lexer-generator](../lexer-generator) - A lightly-typescriptified version of jison-lex
* [parser](../parser) - runtime library for parsers
* [lexer](../lexer) - runtime library for lexers
* [common](../common) - functions needed by parser and lexer
