import { z } from "zod";

export const money = z.coerce.number().finite();
export const positiveMoney = z.coerce.number().finite().positive();
export const isoDate = z.coerce.date();
export const uuid = z.string().uuid();
