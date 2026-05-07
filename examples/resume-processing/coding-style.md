# Style Guide

This project follows a compact TypeScript formatting.

## Core Rules

### Indentation
- Use **4 space tabs** for indentation.
- Tab width should be treated as **4**.

### Braces
- Use **Allman-style braces** whenever possible.
- Opening braces go on the next line for:
  - classes
  - interfaces
  - enums
  - functions
  - methods
  - control blocks when manually formatted

Example:

```ts
export interface Example
{
	value:string;
}
```

### Spacing
- Do not add spaces around `:`
- Do not add spaces around `=`
- Keep type declarations compact
- Avoid unnecessary horizontal whitespace
- Add spaces around `||` and `&&`

Examples:

```ts
const value='abc';
let count:number=1;
type Name=string|number|null;
```

### TypeScript Types
- Keep unions compact:
  - `string|number`
- Keep intersections compact:
  - `Base&Extra`
- Keep generic defaults compact:
  - `Type<T=string>`

Example:

```ts
type Result<T>=T extends null|undefined?never:T;
```

### Functions and Methods
- No space before parameter list
- Parameters should use compact type annotation style
- Return types should be compact

Example:

```ts
public async getAsync(
	id:string,
	cancel?:CancelToken
):Promise<string>{
	return await this.requestAsync('GET',`/item/${id}`);
}
```

### Objects
- Use compact object literals when short
- No spaces inside object braces for compact objects

Example:

```ts
return this.requestAsync('POST','/path',{id,value});
```

### Arrays
- Keep arrays compact where readable

Example:

```ts
const ops=['and','or'];
```

### Strings
- Prefer single quotes
- Use template strings only when interpolation is needed, avoid concatenating string using the + operator

### Semicolons
- Always use semicolons.

### Trailing Commas
- Use trailing commas.

### Blank Lines
- Use blank lines between top-level declarations.
- Use blank lines to separate logical sections.
- Avoid excessive vertical spacing.

### Comments
- Use JSDoc for exported/public types and APIs.
- Keep comments concise and descriptive.

Example:

```ts
/**
 * A normalized node path
 */
path:string;
```

### Ternary
Prefer Ternaries for compactness and for allowing the use of `const` over `let`. Long Ternary
should be formatted in the style of nested ifs using parentheses can a colon in-place of curly brackets
and the else keyword.

Example:
```ts
const state=(
    !userSignedIn?
        'new-user'
    :!basicInfoComplete?
        'onboarding'
    :!paymentDetailsComplete?
        'payment'
    :
        'ready'
)
```

Avoid using long Ternaries if the logic needs to be replicated.

Example of when NOT TO USE:
```ts

// DO NOT DO THIS -------
const state=(
    !userSignedIn?
        'new-user'
    :!basicInfoComplete?
        'onboarding'
    :!paymentDetailsComplete?
        'payment'
    :
        'ready'
)
const displayMessage=(
    !userSignedIn?
        'Sign-in required'
    :!basicInfoComplete?
        'Enter basic info'
    :!paymentDetailsComplete?
        'Enter payment details'
    :
        'Your ready to go'
)
// ---------------------


// DO THIS INSTEAD ------
let state:string;
let displayMessage:string;
if(!userSignedIn){
    state='new-user';
    displayMessage='Sign-in required';
}else if(!basicInfoComplete){
    state='onboarding';
    displayMessage='Enter basic info';
}else if(!paymentDetailsComplete){
    state='payment';
    displayMessage='Enter payment details';
}else{
    state='ready';
    displayMessage='Your ready to go';
}
// ---------


// OR DO THIS --------
// Only use this type of Ternary deconstruction when the code is not in the hot path
// and performance is not critical
const {state,displayMessage}=(
    !userSignedIn?
        {state:'new-user',displayMessage:'Sign-in required'}
    :!basicInfoComplete?
        {state:'onboarding',displayMessage:'Enter basic info'}
    :!paymentDetailsComplete?
        {state:'payment',displayMessage:'Enter payment details'}
    :
        {state:'ready',displayMessage:'Your ready to go'}
)
// ---------
```