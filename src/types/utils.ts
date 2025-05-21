// src/types/utils.ts
import type { Ref } from 'vue';

/**
 * Represents a value that could either be a plain type T or a Vue Ref<T>.
 */
export type MaybeRef<T> = T | Ref<T>;

/**
 * Represents a value that could either be a plain type T or a Vue Ref<T | undefined | null>.
 * Useful for refs that might not be initialized yet or can be null.
 */
export type MaybeRefOrNullable<T> = T | Ref<T | undefined | null>;

/**
 * A generic type for functions that return a Promise.
 */
export type AsyncFunction<A extends any[] = any[], R = any> = (...args: A) => Promise<R>;

/**
 * For objects where keys are strings and values can be of any type.
 */
export type StringKeyedObject = Record<string, any>;

/**
 * For objects where keys are numbers and values can be of any type.
 */
export type NumberKeyedObject = Record<number, any>;