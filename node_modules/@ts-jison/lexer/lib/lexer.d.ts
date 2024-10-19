import { TokenLocation, ParseErrorType } from '@ts-jison/common';
export interface JisonLexerApi {
    EOF: number;
    parseError: ParseErrorType;
    setInput: (input: string, yy: any) => JisonLexerApi;
    input: () => string;
    unput: (str: string) => JisonLexerApi;
    more: () => JisonLexerApi;
    less: (n: number) => void;
    pastInput: () => string;
    upcomingInput: () => string;
    showPosition: () => string;
    test_match: (regex_match_array: RegExpMatchArray | null, rule_index: any) => string | number | false;
    next: () => number | boolean;
    lex: () => number | boolean;
    begin: (condition: string) => void;
    popState: () => string;
    _currentRules: () => number[];
    topState: (n: number) => string;
    pushState: (condition: string) => void;
    options: {
        /** token location info will include a .range[] member */
        ranges?: boolean;
        /** flex-like lexing behaviour where the rules are tested exhaustively to find the longest match */
        flex?: boolean;
        /** lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code */
        backtrack_lexer?: boolean;
    };
    performAction: (yy: any, yy_: any, $avoiding_name_collisions: number, YY_START: any) => any;
    rules: RegExp[];
    conditions: {
        [name: string]: number[];
    };
    yy?: any;
    reject: () => JisonLexerApi;
    stateStackSize: () => number;
    yylloc: TokenLocation;
    yyleng: number;
    yytext?: string;
    match?: string;
    yylineno?: number;
}
export declare abstract class JisonLexer {
    yy: any;
    constructor(yy?: any);
    EOF: number;
    options: any;
    _input?: string;
    _more?: boolean;
    _backtrack?: boolean;
    done?: boolean;
    yylineno?: number;
    yyleng: number;
    yytext?: string;
    conditionStack?: string[];
    match?: string;
    matches?: RegExpMatchArray | null;
    matched?: string;
    yylloc: TokenLocation;
    offset?: number;
    parseError(str: string, hash: {
        [key: string]: any;
    }): void;
    setInput(input: string, yy: any): JisonLexer;
    input(): string;
    unput(ch: string): JisonLexer;
    more(): JisonLexer;
    reject(): JisonLexer;
    less(n: number): void;
    pastInput(): string;
    upcomingInput(): string;
    showPosition(): string;
    test_match(match: RegExpMatchArray | null, indexed_rule: any): any;
    next(): number | boolean;
    lex(): number | boolean;
    begin(condition: string): void;
    popState(): string;
    _currentRules(): any;
    topState(n: number): string;
    pushState(condition: string): void;
    stateStackSize(): number;
    abstract performAction(yy: any, yy_: any, $avoiding_name_collisions: any, YY_START: any): any;
    abstract rules: RegExp[];
    abstract conditions: any;
}
//# sourceMappingURL=lexer.d.ts.map