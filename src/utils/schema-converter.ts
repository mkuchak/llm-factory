import {
  type ZodSchema,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodObject,
  ZodOptional,
  ZodEnum,
  ZodLiteral,
  ZodArray,
} from "zod";

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
function convertFieldsWithDescriptions(fields: Record<string, ZodSchema<any>>): { 
  convertedFields: Record<string, any>;
  propertyOrder: string[];
} {
  const propertyOrder: string[] = [];
  const convertedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      propertyOrder.push(key);
      const fieldDescription = (value as any)._def.description;
      const converted = convertToGeminiSchema(value);

      if (fieldDescription) {
        converted.description = fieldDescription;
      }

      return [key, converted];
    })
  );

  return { convertedFields, propertyOrder };
}

/**
 * Convert Zod schema to Gemini-compatible schema
 */
export function convertToGeminiSchema(schema: ZodSchema<any>): any {
  // String handling
  if (schema instanceof ZodString) {
    const result: any = { type: "string" };
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    return result;
  }

  // Number handling
  if (schema instanceof ZodNumber) {
    const result: any = { type: "number" };
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    return result;
  }

  // Boolean handling
  if (schema instanceof ZodBoolean) {
    const result: any = { type: "boolean" };
    const description = (schema as any)._def.description;
    if (description) result.description = description;
    return result;
  }

  // Object handling
  if (schema instanceof ZodObject) {
    const { convertedFields, propertyOrder } = convertFieldsWithDescriptions(schema.shape);
    const result: any = {
      type: "object",
      properties: convertedFields,
      propertyOrdering: propertyOrder,
      required: Object.keys(schema.shape).filter((key) => !(schema.shape[key] instanceof ZodOptional)),
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
  if (schema instanceof ZodArray) {
    const result: any = {
      type: "array",
      items: convertToGeminiSchema(schema.element),
    };

    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) result.description = description;

    return result;
  }

  // Optional field handling
  if (schema instanceof ZodOptional) {
    // Convert the inner schema
    const converted = convertToGeminiSchema(schema.unwrap());

    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) converted.description = description;

    return converted;
  }

  // Enum handling
  if (schema instanceof ZodEnum) {
    const result: any = {
      type: "string",
      enum: schema._def.values,
    };

    // Add description if exists
    const description = (schema as any)._def.description;
    if (description) result.description = description;

    return result;
  }

  // Literal handling (for single values)
  if (schema instanceof ZodLiteral) {
    const literalValue = schema._def.value;
    const type = typeof literalValue;

    const result: any = {
      type: type === "string" ? "string" : type === "number" ? "number" : type === "boolean" ? "boolean" : "string",
      enum: [literalValue],
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
export function zodToGeminiSchema(schema: ZodSchema<any>): any {
  const converted = convertToGeminiSchema(schema);

  // The top level must have a type
  if (!converted.type && converted.properties) {
    converted.type = "object";
  }

  return converted;
}
