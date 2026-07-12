"use client"

import { type ReactNode } from "react"
import {
  useFormContext,
  type UseFormReturn,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form"

interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>
  onSubmit: (data: T) => void | Promise<void>
  children: ReactNode
  className?: string
}

export function Form<T extends FieldValues>({ form, onSubmit, children, className }: FormProps<T>) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      {children}
    </form>
  )
}

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  options?: RegisterOptions<T>
  disabled?: boolean
  textarea?: boolean
}

export function FormField<T extends FieldValues>({
  name,
  label,
  type = "text",
  placeholder,
  required,
  options,
  disabled,
  textarea,
}: FormFieldProps<T>) {
  const { register, formState: { errors } } = useFormContext<T>()
  const error = errors[name]
  const Component = textarea ? "textarea" : "input"

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name as string} className="text-sm font-medium">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Component
        id={name as string}
        type={textarea ? undefined : type}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-md border px-3 py-2 text-sm ${
          error ? "border-red-500" : "border-gray-300"
        } ${disabled ? "bg-gray-100" : ""}`}
        {...register(name, { required: required ? `${label || name} is required` : undefined, ...options })}
        {...(textarea ? { rows: 3 } : {})}
      />
      {error && (
        <p className="text-xs text-red-500">{error.message as string}</p>
      )}
    </div>
  )
}
