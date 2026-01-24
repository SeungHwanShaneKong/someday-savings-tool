-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '우리의 결혼 예산',
  wedding_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Create budget_items table
CREATE TABLE public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on budget_items
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Budget items policies (access through budget ownership)
CREATE POLICY "Users can view their budget items"
  ON public.budget_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_items.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their budget items"
  ON public.budget_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_items.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their budget items"
  ON public.budget_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_items.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their budget items"
  ON public.budget_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_items.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

-- Create shared_budgets table for shareable links
CREATE TABLE public.shared_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shared_budgets
ALTER TABLE public.shared_budgets ENABLE ROW LEVEL SECURITY;

-- Shared budgets policies
CREATE POLICY "Users can view their shared links"
  ON public.shared_budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = shared_budgets.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active shared budgets by token"
  ON public.shared_budgets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can insert shared links for their budgets"
  ON public.shared_budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = shared_budgets.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their shared links"
  ON public.shared_budgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = shared_budgets.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();