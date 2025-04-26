import { z } from "zod";

/**
 * Zod Schema Converter for Google Gemini AI
 *
 * This utility converts Zod schema into Google's Gemini compatible format.
 * Handles conversion of unions, objects, arrays, and optional fields.
 * 
 * Based on: https://gist.github.com/Nishkalkashyap/1013c6e523e1974a8aaa4da54a5f0b0e
 */

/**
 * Convert fields with descriptions
 */
function convertFieldsWithDescriptions(
  fields: Record<string, z.ZodTypeAny>
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      const fieldDescription = (value as any)._def.description;
      const converted = convertToGeminiSchema(value);
      
      if (fieldDescription) {
        converted.description = fieldDescription;
      }
      
      return [key, converted];
    })
  );
}

/**
 * Convert Zod schema to Gemini-compatible schema
 */
export function convertToGeminiSchema(schema: z.ZodTypeAny): any {
  // String handling
  if (schema instanceof z.ZodString) {
    const result: any = { type: "string" };
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    return result;
  }
  
  // Number handling
  if (schema instanceof z.ZodNumber) {
    const result: any = { type: "number" };
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    return result;
  }
  
  // Boolean handling
  if (schema instanceof z.ZodBoolean) {
    const result: any = { type: "boolean" };
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    return result;
  }
  
  // Object handling
  if (schema instanceof z.ZodObject) {
    const convertedShape = convertFieldsWithDescriptions(schema.shape);
    const result: any = {
      type: "object",
      properties: convertedShape,
      required: Object.keys(schema.shape).filter(
        key => !(schema.shape[key] instanceof z.ZodOptional)
      )
    };
    
    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    
    // If no required fields, don't include the property
    if (result.required.length === 0) {
      delete result.required;
    }
    
    return result;
  }
  
  // Array handling
  if (schema instanceof z.ZodArray) {
    const result: any = {
      type: "array",
      items: convertToGeminiSchema(schema.element)
    };
    
    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    
    return result;
  }
  
  // Optional field handling
  if (schema instanceof z.ZodOptional) {
    // Convert the inner schema
    const converted = convertToGeminiSchema(schema.unwrap());
    
    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) converted.description = description;
    
    return converted;
  }
  
  // Enum handling
  if (schema instanceof z.ZodEnum) {
    const result: any = {
      type: "string",
      enum: schema._def.values
    };
    
    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    
    return result;
  }
  
  // Literal handling (for single values)
  if (schema instanceof z.ZodLiteral) {
    const literalValue = schema._def.value;
    const type = typeof literalValue;
    
    const result: any = {
      type: type === "string" ? "string" : 
            type === "number" ? "number" : 
            type === "boolean" ? "boolean" : "string",
      enum: [literalValue]
    };
    
    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    
    return result;
  }
  
  // Default to string if type not specifically handled
  return { type: "string" };
}

/**
 * Convert a Zod schema to a Google Gemini compatible schema
 */
export function zodToGeminiSchema(schema: z.ZodTypeAny): any {
  const converted = convertToGeminiSchema(schema);
  
  // The top level must have a type
  if (!converted.type && converted.properties) {
    converted.type = "object";
  }
  
  return converted;
} 