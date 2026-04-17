import { parseConvoCode, parseConvoCodeBlocks } from "@convo-lang/convo-lang";
import { expect, test } from "bun:test";

test('parse-code-block',()=>{
    const escapedContent='console.log(123);//CLOSE_ESC';
    const blockContent='console.log(123);//</EXAMPLE_BLOCK>';
    const src=`
        > user
        <EXAMPLE_BLOCK a-name="abc" bName="xyz" escName="a&amp;b" closing-escape="CLOSE_ESC" bool>
        \`\`\` js
            ${escapedContent}
        \`\`\`
        </EXAMPLE_BLOCK>
    `
    const r=parseConvoCode(src,{enableCodeBlocks:true});

    expect(r.result).toBeDefined();
    if(!r.result){return;}

    expect(r.result.length).toBe(1);

    const first=r.result[0];
    expect(first).toBeDefined();
    if(!first){return;}

    expect(first.codeBlocks).toBeDefined();
    const b=first.codeBlocks?.[0];
    expect(b).toBeDefined();
    if(!b){return;}

    expect(b.tagName).toBe('EXAMPLE_BLOCK');
    expect(b.lang).toBe('js');
    expect(b.attributes).toEqual({
        ['a-name']:'abc',
        bName:'xyz',
        escName:'a&b',
        ['closing-escape']:'CLOSE_ESC',
        bool:'',

    });
    expect(b.content.trim()).toBe(blockContent);
    expect(b.startIndex).toBe(src.indexOf('<'));
    expect(b.endIndex).toBe(src.lastIndexOf('>')+1);

    const blocks=parseConvoCodeBlocks(src);
    expect(blocks?.[0]?.startIndex).toBe(b.startIndex);
    expect(blocks?.[0]?.endIndex).toBe(b.endIndex);



});