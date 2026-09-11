import type { ReactNode } from "react"

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`border rounded-lg shadow-md p-4 ${className}`}>{children}</div>
)

export const CardContent = ({ children }: { children: ReactNode }) => <div>{children}</div>

export const CardHeader = ({ children }: { children: ReactNode }) => <div className="mb-4">{children}</div>

export const CardTitle = ({ children }: { children: ReactNode }) => <h2 className="text-lg font-medium">{children}</h2>

export const Textarea = ({
  className,
  ...props
}: {
  className?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) => (
  <textarea
    className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-provence-800 ${className}`}
    {...props}
  />
)

export const Button = ({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
  type?: "submit" | "button"
  variant?: "outline"
  size?: "sm"
  asChild?: boolean
}) => {
  const buttonProps = {
    className: `py-2 px-4 rounded-md text-white bg-provence-900 hover:bg-provence-900/90 ${className}`,
    ...props,
  }

  if (props.asChild) {
    return <span {...buttonProps}>{children}</span>
  }

  return <button {...buttonProps}>{children}</button>
}

