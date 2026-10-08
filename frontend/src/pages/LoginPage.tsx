import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import Brand from '@/components/Brand'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const schema = z.object({
  email: z.string().email('Email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const { data: settings } = useSettings()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@chantier.test', password: 'password' },
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await login(values.email, values.password)
      navigate('/dashboard')
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        setError('Trop de tentatives. Réessaie dans une minute.')
      } else if (isAxiosError(err) && err.response?.status === 422) {
        setError('Identifiants invalides.')
      } else {
        setError('Une erreur est survenue.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1c] px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-lg"
      >
        <div className="space-y-1">
          <Brand size={30} />
          <h1 className="text-lg font-semibold text-gray-900">{settings?.app_name ?? 'Lachat Construction'}</h1>
          <p className="text-xs text-gray-500">StepBuild · Gestion de chantier</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Mot de passe"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Se connecter
        </Button>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="text-primary-600 hover:text-primary-800">
            Mot de passe oublié ?
          </Link>
        </p>
      </form>
    </div>
  )
}
