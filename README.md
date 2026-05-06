# PsiApp

Plataforma mobile para conectar psicólogos e pacientes para sessões de terapia.

---

## Funcionalidades atuais (MVP)

### Autenticação
- Cadastro de **Paciente** com: nome completo, data de nascimento e e-mail
- Cadastro de **Psicólogo** com: nome completo, CRP, CPF, e-mail, anos de experiência e área de atuação
- Criação de senha após o cadastro (mínimo 8 caracteres)
- Login com e-mail e senha
- Logout com redirecionamento para a tela inicial

### Áreas de atuação (psicólogo)
- Crianças
- Casamento
- Vida Profissional
- Vida Familiar
- Depressão

### Tela Home
- Exibe o nome e perfil do usuário logado (paciente ou psicólogo)
- Placeholder para funcionalidades futuras

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Mobile | React Native + Expo (SDK 54) |
| Navegação | Expo Router v6 (file-based) |
| Backend / Auth | Supabase |
| Banco de dados | PostgreSQL (via Supabase) |
| Linguagem | TypeScript |
| Armazenamento local | AsyncStorage (sessão do usuário) |

---

## Estrutura do projeto

```
psi_app/
├── app/
│   ├── _layout.tsx               # Root layout + controle de navegação por auth
│   ├── index.tsx                 # Tela inicial (PsiApp)
│   ├── auth/
│   │   ├── _layout.tsx           # Layout do grupo de auth
│   │   ├── login.tsx             # Tela de login
│   │   ├── role-select.tsx       # Seleção de perfil (paciente/psicólogo)
│   │   ├── register-patient.tsx  # Cadastro de paciente
│   │   ├── register-psychologist.tsx # Cadastro de psicólogo
│   │   └── set-password.tsx      # Definição de senha
│   └── (home)/
│       └── index.tsx             # Tela home (autenticada)
├── components/
│   ├── Button.tsx                # Botão reutilizável (primary/outline/ghost)
│   └── Input.tsx                 # Campo de input com suporte a senha
├── constants/
│   └── theme.ts                  # Cores, espaçamentos e tipografia
├── context/
│   ├── auth.tsx                  # Contexto de autenticação (sessão)
│   └── registration.tsx          # Contexto temporário de cadastro multi-step
├── lib/
│   └── supabase.ts               # Configuração do cliente Supabase
└── supabase/
    └── schema.sql                # Schema do banco de dados
```

---

## Banco de dados

Três tabelas principais no Supabase com Row Level Security (RLS) habilitado:

```sql
profiles         -- dados básicos de todos os usuários
  id             -- FK para auth.users
  full_name
  email
  role           -- 'patient' | 'psychologist'

psychologists    -- dados extras do psicólogo
  id             -- FK para profiles
  crp_number
  cpf
  years_of_experience
  focus_area     -- 'children' | 'marriage' | 'professional_life' | 'family_life' | 'depression'

patients         -- dados extras do paciente
  id             -- FK para profiles
  birth_date
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [Expo Go](https://expo.dev/go) instalado no celular:
  - [Android — Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS — App Store](https://apps.apple.com/app/expo-go/id982107779)
- Conta no [Supabase](https://supabase.com) (gratuita)

---

## Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/psi-app.git
cd psi-app
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

**3.1** Crie um projeto em [supabase.com](https://supabase.com)

**3.2** No painel do Supabase, vá em **SQL Editor → New Query**, cole o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**

**3.3** Vá em **Authentication → Sign In / Providers → Email** e desative a opção **"Confirm email"** (necessário para o MVP)

**3.4** Vá em **Settings → API** e copie:
- **Project URL**
- **anon / public key**

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

### 5. Rode o projeto

```bash
npx expo start --clear
```

Um QR Code será exibido no terminal.

### 6. Abra no celular

1. Instale o **Expo Go** no seu celular (links nos pré-requisitos)
2. **Android**: abra o Expo Go e escaneie o QR Code
3. **iOS**: abra a câmera do iPhone, aponte para o QR Code e toque na notificação que aparecer

> O celular e o computador precisam estar na **mesma rede Wi-Fi**.

---

## Testando o fluxo

### Criar conta como Paciente
1. Abra o app → toque em **Criar conta**
2. Selecione **Sou Paciente**
3. Preencha nome, data de nascimento (DD/MM/AAAA) e e-mail
4. Crie uma senha com mínimo 8 caracteres
5. Você será redirecionado para a tela home

### Criar conta como Psicólogo
1. Abra o app → toque em **Criar conta**
2. Selecione **Sou Psicólogo**
3. Preencha todos os campos, incluindo CRP, CPF e área de atuação
4. Crie uma senha com mínimo 8 caracteres
5. Você será redirecionado para a tela home

### Login
1. Abra o app → toque em **Entrar**
2. Informe e-mail e senha cadastrados
3. Você será redirecionado para a tela home

### Logout
1. Na tela home, toque em **Sair**
2. Confirme no diálogo
3. Você será redirecionado para a tela inicial do PsiApp
