import { Outlet } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <Outlet />
        </div>
    );
};

export default Layout;
