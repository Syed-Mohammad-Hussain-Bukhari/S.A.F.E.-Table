import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  format,
  subDays,
  isSameDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,



  startOfDay,
  endOfDay,

  isSameMonth } from



"date-fns";
import { Calendar as CalendarIcon, Download, DollarSign, TrendingUp, CreditCard, ShoppingBag } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrders } from "@/hooks/useOrders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";




const SalesReportPage = () => {
  const [date, setDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [timeRange, setTimeRange] = useState('week');
  const { getAllOrders } = useOrders();
  const orders = getAllOrders();

  // Filter orders based on time range and selected date
  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    // if (timeRange === 'all-time') return orders; // Removed

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);

      if (timeRange === 'custom') {
        if (!dateRange?.from) return false;
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);
        return orderDate >= start && orderDate <= end;
      }

      if (!date) return false;

      if (!date) return false;

      if (timeRange === 'week') {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return orderDate >= start && orderDate <= end;
      }
      if (timeRange === 'month') return isSameMonth(orderDate, date) && orderDate.getFullYear() === date.getFullYear();
      if (timeRange === 'year') return orderDate.getFullYear() === date.getFullYear();
      return false;
    });
  }, [orders, date, timeRange, dateRange]);

  // Aggregating real data from *filtered* orders
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const transactionCount = filteredOrders.length;
    const avgOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // Simple mock for "Net Profit" as 30% of revenue
    const netProfit = totalRevenue * 0.3;

    return [
    { title: "Revenue", value: `$${totalRevenue.toFixed(2)}`, change: "Selected Period", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Net Profit (Est.)", value: `$${netProfit.toFixed(2)}`, change: "30% Margin", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Transactions", value: transactionCount.toString(), change: "Count", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Avg. Order Value", value: `$${avgOrderValue.toFixed(2)}`, change: "Average", icon: ShoppingBag, color: "text-orange-500", bg: "bg-orange-500/10" }];

  }, [filteredOrders]);

  // Generating Dynamic Chart Data based on timeRange and selected date
  const chartData = useMemo(() => {
    if (timeRange === 'custom') {
      if (!dateRange?.from) return [];
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to || dateRange.from);
      const days = eachDayOfInterval({ start, end });


      const dataPoints = days.map((day) => ({
        date: day,
        name: format(day, 'MMM d'),
        revenue: 0
      }));

      filteredOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        const point = dataPoints.find((p) => isSameDay(p.date, orderDate));
        if (point) point.revenue += order.totalPrice;
      });
      return dataPoints;
    }

    if (!date) return [];

    let dataPoints = [];
    const currentOrders = filteredOrders;

    if (timeRange === 'week' && date) {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });

      dataPoints = days.map((day) => ({
        date: day,
        name: format(day, 'EEE'),
        revenue: 0
      }));

      currentOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        const point = dataPoints.find((p) => isSameDay(p.date, orderDate));
        if (point) point.revenue += order.totalPrice;
      });

    } else if (timeRange === 'month' && date) {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });

      dataPoints = days.map((day) => ({
        date: day,
        name: format(day, 'EEE'),
        revenue: 0
      }));

      currentOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        const point = dataPoints.find((p) => isSameDay(p.date, orderDate));
        if (point) point.revenue += order.totalPrice;
      });

    } else if (timeRange === 'year' && date) {
      const start = startOfYear(date);
      const end = endOfYear(date);
      const months = eachMonthOfInterval({ start, end });

      dataPoints = months.map((month) => ({
        date: month,
        name: format(month, 'MMM'),
        revenue: 0
      }));

      currentOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        const point = dataPoints.find((p) => isSameMonth(p.date, orderDate));
        if (point) point.revenue += order.totalPrice;
      });
    }

    return dataPoints;
  }, [filteredOrders, date, timeRange, dateRange]);


  const handleExport = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return;
    }

    const headers = ["Order ID", "Date", "Table", "Total Price", "Status"];
    const csvRows = [headers.join(",")];

    filteredOrders.forEach((order) => {
      const row = [
      order.orderId,
      format(new Date(order.createdAt), "yyyy-MM-dd HH:mm:ss"),
      `Table ${order.tableNumber}`,
      order.totalPrice.toFixed(2),
      order.status];

      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-report-${timeRange}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];


  const handleYearChange = (year) => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setFullYear(parseInt(year));
    setDate(newDate);
  };

  const handleMonthChange = (monthIndex) => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setMonth(parseInt(monthIndex));
    setDate(newDate);
  };

  const getReportTitle = () => {
    // if (timeRange === 'all-time') return "Revenue Overview (All Time)"; // Removed
    if (timeRange === 'custom') {
      if (dateRange?.from) {
        if (dateRange.to) {
          return `Revenue Overview (${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')})`;
        }
        return `Revenue Overview (${format(dateRange.from, 'MMM d, yyyy')})`;
      }
      return "Revenue Overview (Custom Range)";
    }
    if (!date) return "Revenue Overview";
    return `Revenue Overview (${timeRange} View - ${format(date, 'MMM d, yyyy')})`;
=======
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, DollarSign, TrendingUp, CreditCard, ShoppingBag, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { salesApi, adminApi } from "@/lib/api";
import { format } from "date-fns";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
];

const SalesReportPage = () => {
  const [period, setPeriod] = useState("week");
  const [chartDays, setChartDays] = useState(30);

  const { data: summary, isLoading: lSum } = useQuery({
    queryKey: ["sales", "summary", period],
    queryFn:  () => salesApi.summary(period),
    refetchInterval: 30_000,
  });
  const { data: chart } = useQuery({
    queryKey: ["sales", "chart", chartDays],
    queryFn:  () => salesApi.revenueChart(chartDays),
  });
  const { data: top } = useQuery({
    queryKey: ["sales", "top", period],
    queryFn:  () => salesApi.topItems(period === "today" ? "today" : period, 10),
  });
  const { data: history } = useQuery({
    queryKey: ["admin", "history"],
    queryFn:  () => adminApi.orderHistory({ skip: 0, limit: 200 }),
  });

  const stats = useMemo(() => {
    const s = summary || {};
    return [
      { title: "Revenue",          value: `$${Number(s.total_revenue ?? 0).toFixed(2)}`, change: PERIODS.find((p) => p.value === period)?.label, icon: DollarSign,  color: "text-green-500",  bg: "bg-green-500/10"  },
      { title: "Avg. Order Value", value: `$${Number(s.average_order_value ?? 0).toFixed(2)}`, change: "Average",                                  icon: ShoppingBag,  color: "text-orange-500", bg: "bg-orange-500/10" },
      { title: "Orders",           value: String(s.total_orders ?? 0),                  change: "Count",                                          icon: CreditCard,   color: "text-purple-500", bg: "bg-purple-500/10" },
      { title: "Completed",        value: String(s.completed_orders ?? 0),              change: `Avg ★ ${s.average_rating ?? "—"}`,                icon: TrendingUp,   color: "text-blue-500",   bg: "bg-blue-500/10"   },
    ];
  }, [summary, period]);

  const chartData = (chart?.data || []).map((d) => ({
    name:    d.date.slice(5),
    revenue: d.revenue,
    orders:  d.orders,
  }));
  const topItems = (top?.items || []).map((i) => ({
    name:     i.name,
    revenue:  i.total_revenue,
    sold:     i.total_sold,
  }));

  const handleExport = () => {
    const orders = history?.orders || [];
    if (!orders.length) return;
    const headers = ["order_id", "table_number", "total_price", "status", "payment_status", "created_at"];
    const rows = orders.map((o) =>
      [o.order_id, o.table_number, Number(o.total_price).toFixed(2), o.status, o.payment_status, o.created_at].join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  };

  return (
    <div className="space-y-6 text-foreground">
<<<<<<< HEAD
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SalesReport</h1>
                    <p className="text-muted-foreground">Analyze your restaurant's financial performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={(v) => {
            setTimeRange(v);
          }}>
                        <SelectTrigger className="w-[120px] bg-input border-input text-foreground">
                            <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {timeRange === 'week' &&
          <Popover>
                            <PopoverTrigger asChild>
                                <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal bg-input border-input text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200",
                  !date && "text-muted-foreground"
                )}>
                
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="end">
                                <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="bg-popover text-popover-foreground"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background font-bold shadow-lg shadow-primary/50 scale-110",
                  day_today: "bg-accent text-primary ring-1 ring-primary/30 font-semibold"
                }} />
              
                            </PopoverContent>
                        </Popover>
          }

                    {timeRange === 'custom' &&
          <Popover>
                            <PopoverTrigger asChild>
                                <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal bg-input border-input text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200",
                  !dateRange && "text-muted-foreground"
                )}>
                
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ?
                dateRange.to ?
                <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </> :

                format(dateRange.from, "LLL dd, y") :


                <span>Pick a date range</span>
                }
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="end">
                                <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="bg-popover text-popover-foreground"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background font-bold shadow-lg shadow-primary/50",
                  day_today: "bg-accent text-primary ring-1 ring-primary/30 font-semibold",
                  day_range_middle: "aria-selected:bg-primary/30 aria-selected:text-foreground"
                }} />
              
                            </PopoverContent>
                        </Popover>
          }

                    {timeRange === 'month' &&
          <div className="flex gap-2">
                            <Select value={date?.getMonth().toString()} onValueChange={handleMonthChange}>
                                <SelectTrigger className="w-[140px] bg-input border-input text-foreground">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground">
                                    {months.map((month, index) =>
                <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                )}
                                </SelectContent>
                            </Select>
                            <Select value={date?.getFullYear().toString()} onValueChange={handleYearChange}>
                                <SelectTrigger className="w-[100px] bg-input border-input text-foreground">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground">
                                    {years.map((year) =>
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                )}
                                </SelectContent>
                            </Select>
                        </div>
          }

                    {timeRange === 'year' &&
          <Select value={date?.getFullYear().toString()} onValueChange={handleYearChange}>
                            <SelectTrigger className="w-[120px] bg-input border-input text-foreground">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                {years.map((year) =>
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              )}
                            </SelectContent>
                        </Select>
          }

                    <Button
            variant="outline"
            className="bg-input border-input text-foreground hover:bg-accent hover:text-accent-foreground gap-2"
            onClick={handleExport}>
            
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) =>
        <Card key={stat.title} className="p-6 bg-card border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                                {stat.change}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                        </div>
                    </Card>
        )}
            </div>

            <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-bold mb-6 text-foreground capitalize">
                    {getReportTitle()}
                </h2>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false} />
              
                            <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`} />
              
                            <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value) => [`$${value.toFixed(2)}`, "Revenue"]} />
              
                            <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)" />
              
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>);

};

export default SalesReportPage;
=======
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Report</h1>
          <p className="text-muted-foreground">Live revenue, orders, and best-sellers from the backend.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-input border-input">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={String(chartDays)} onValueChange={(v) => setChartDays(Number(v))}>
            <SelectTrigger className="w-[140px] bg-input border-input">
              <SelectValue placeholder="Chart days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title} className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground">{s.change}</span>
            </div>
            <h3 className="text-2xl font-bold">{s.value}</h3>
            <p className="text-sm text-muted-foreground">{s.title}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-bold mb-6">Revenue ({chartDays} days)</h2>
        {lSum ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading…</div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-bold mb-6">Top sellers ({PERIODS.find((p) => p.value === period)?.label})</h2>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topItems}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-15} dy={8} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
              <Bar dataKey="sold" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default SalesReportPage;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
