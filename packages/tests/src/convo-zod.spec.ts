import { zodTypeToJsonScheme } from '@iyio/common';
import { describe, expect, test } from "bun:test";
import { z } from 'zod';

describe('convo-zod',()=>{

    test('should convert zod enum',()=>{

        const scheme=z.object({
            enumProp:z.enum(['a','b','c'])
        })

        const json=zodTypeToJsonScheme(scheme);

        expect(json).not.toBeUndefined();

        expect(json?.properties?.['enumProp']?.enum).toEqual(['a','b','c']);
    })

    test('should convert lazy zod enum',()=>{


        const scheme=z.object({
            enumProp:z.lazy(()=>enumScheme)
        })

        const enumScheme=z.enum(['a','b','c']);

        const json=zodTypeToJsonScheme(scheme);

        expect(json).not.toBeUndefined();

        expect(json?.properties?.['enumProp']?.enum).toEqual(['a','b','c']);
    })

});




