import { Navbar } from "@/components/navbar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-7xl p-8">{children}</main>
        </>
    )
}