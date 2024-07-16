'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { getUser } from './data';
import bcrypt from 'bcrypt'
// ...

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }), date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }


    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;
    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
        `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Update Invoice.',
        };
    }


    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.',
        };
    }
    revalidatePath('/dashboard/invoices');
}
const SignUpSchema = z.object({
    id: z.string(),
    email: z.string().min(1, { message: "This field has to be filled." }).email("This is not a valid email."),
    username: z.string().min(3, { message: "Username must be more than 3 letters" }),
    password: z.string().min(6, { message: "Password must be more than 6 letters" })
});

const AuthenticateUser = SignUpSchema.omit({ id: true, username: true });
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

const CreateUser = SignUpSchema.omit({ id: true });

export async function signUpUser(
    prevState: string | undefined,
    formData: FormData,
) {

    const validatedFields = CreateUser.safeParse({
        email: formData.get('email'),
        username: formData.get('username'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return 'Credentials Inputed Incorrectly';
    }
    const { email, username, password } = validatedFields.data;

    try {
        const user = await getUser(email);
        if (user) {
            return 'User Already Exists';
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword)
        await sql`
        INSERT INTO users (email, name, password)
        VALUES (${email}, ${username}, ${hashedPassword})
        `;

        await signIn('credentials', formData);

        //createUser(formData.)
    }
    catch (error) {
        // if (error instanceof AuthError) {
        //     switch (error.type) {
        //         case 'CredentialsSignin':
        //             return 'Invalid credentials.';
        //         default:
        //             return 'Something went wrong.';
        //     }
        // }
        throw error;
    }
}
