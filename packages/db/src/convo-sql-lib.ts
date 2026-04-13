/**
 * The normalized result returned from SQL execution.
 * 
 * This shape is intentionally minimal so different database drivers can adapt their native
 * response objects into a consistent format.
 */
export interface ConvoSqlQueryResult
{
    /**
     * Rows returned by the query.
     * 
     * For non-select statements this is typically an empty array.
     */
    rows:any[];

    /**
     * Number of rows affected by an update, insert, or delete statement when that information is
     * available from the underlying driver.
     */
    updateCount?:number;
}

/**
 * Symbol marker used to identify values that represent SQL identifiers rather than SQL parameters.
 * 
 * This is used by higher-level SQL builders to distinguish a value like a table or column name from
 * a normal bound parameter value.
 */
export const ConvoSqlNameFlag=Symbol('ConvoSqlSqlName');

/**
 * Wrapper type representing a SQL identifier, such as a table name or column name, that should be
 * emitted as SQL source rather than parameterized as a bound value.
 */
export interface ConvoSqlSqlName
{
    /**
     * The raw identifier name.
     */
    name:string;

    /**
     * Internal marker used to identify this object as a SQL name wrapper.
     */
    [ConvoSqlNameFlag]:true;
}

/**
 * Returns true when a value is a {@link ConvoSqlSqlName}.
 * 
 * @param value Value to test.
 * @returns `true` if the value is a SQL name wrapper.
 */
export const isConvoSqlName=(value:any):value is ConvoSqlSqlName=>{
    return value?.[ConvoSqlNameFlag]===true;
}

/**
 * Supported SQL backend types for conversation node SQL stores.
 */
export type ConvoNodeSqlStoreType='sqlite'|'postgres'|'mysql'|'mssql'|'oracle';

/**
 * Represents a SQL statement as alternating literal fragments and parameter values.
 * 
 * The `sql` array contains the string parts from a template literal and `params` contains the
 * interpolated values in order. Consumers are responsible for converting this representation into
 * the placeholder syntax required by the actual SQL driver being used.
 */
export interface ConvoSqlParams
{
    /**
     * SQL literal fragments.
     * 
     * These are typically the static pieces captured from a tagged template literal.
     */
    sql:string[];

    /**
     * Parameter values corresponding to interpolated expressions between entries in `sql`.
     */
    params:any[];
}

/**
 * Wraps a SQL identifier name so it can be handled as SQL source rather than as a bound parameter.
 * 
 * This function only marks the identifier. Actual identifier escaping or quoting for a target
 * database is the responsibility of the code that renders {@link ConvoSqlParams} into executable
 * SQL.
 * 
 * @param name Identifier name to wrap.
 * @returns A marked SQL name object.
 */
export const escapeConvoSqlName=(name:string):ConvoSqlSqlName=>{
    return {
        name,
        [ConvoSqlNameFlag]:true,
    }
}

/**
 * Tagged template helper for building {@link ConvoSqlParams}.
 * 
 * Example:
 * ```ts
 * const query=convoSql`select * from node where path=${"/a"}`
 * ```
 * 
 * Behavior:
 * - static template parts are stored in `sql`
 * - interpolated values are stored in `params`
 * - no SQL string rendering or placeholder conversion is performed here
 * - SQL identifier wrappers created by `escapeConvoSqlName()` are preserved in `params`
 * 
 * @param strings Template string literal fragments.
 * @param values Interpolated parameter values.
 * @returns SQL fragments and parameter values.
 */
export function convoSql(strings:TemplateStringsArray,...values:any[]):ConvoSqlParams{
    const sql:string[]=[];
    const params:any[]=[];

    for(let i=0;i<strings.length;i++){
        sql.push(strings[i] as string);
        if(i<values.length){
            params.push(values[i]);
        }
    }

    return {sql,params};
}