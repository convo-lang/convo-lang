/**
 * A result type with a success and error state where the success result if of type T.
 */
export type ResultType<T>=
{
    success:true;
    result:T;
}| ResultTypeError;

/**
 * A result type with a success and error state and no result value.
 */
export type ResultTypeVoid=
{
    success:true;
}| {
    success:false;
    error:string;
    statusCode:StatusCode;
}

/**
 * The Error state of a ResultType
 */
export type ResultTypeError={
    success:false;
    error:string;
    statusCode:StatusCode;
}

/**
 * Status codes that align with HTTP status code.
 */
export type StatusCode=200|201|301|400|401|404|500;

/**
 * An alias for `Promise<ResultType<T>>`
 */
export type PromiseResultType<T>=Promise<ResultType<T>>;

/**
 * An alias for `Promise<ResultTypeVoid>`
 */
export type PromiseResultTypeVoid=Promise<ResultTypeVoid>;

