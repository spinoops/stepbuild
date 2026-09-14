import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const schema = z.object({ email: z.string().email('Email invalide.') })

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    await api.post('/forgot-password', values)
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Mot de passe oublié</h1>

        {sent ? (
          <p className="text-sm text-gray-600">
            Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-gray-600">
              Entre ton email pour recevoir un lien de réinitialisation.
            </p>
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Envoyer le lien
            </Button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary-600 hover:text-primary-800">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
