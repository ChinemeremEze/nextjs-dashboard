import React from 'react'
import { lusitana } from '../../ui/fonts'
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Customers | Acme Dashboard',
};

export default function Page() {
    return (
        <div className={`${lusitana.className}`}>Customer Page</div>
    )
}
