--
-- PostgreSQL database dump
--

\restrict egunyf8Ohdfaa5hw63YLYoH0CC0cB7cU2gsNuqwjXyAVxI4fVYpN3L4OLplvvHV

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: account_group_buys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_group_buys (
    id text NOT NULL,
    account_id text NOT NULL,
    group_buy_id text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.account_group_buys OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    telegram_username text NOT NULL,
    password_hash text,
    email text,
    account_status text DEFAULT 'active'::text NOT NULL,
    telegram_chat_id text,
    telegram_notifications jsonb DEFAULT '{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}'::jsonb,
    telegram_link_token text,
    telegram_link_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    health_data_consent boolean DEFAULT false NOT NULL,
    discuss_count integer DEFAULT 0 NOT NULL,
    reset_code text,
    reset_code_expires_at timestamp with time zone,
    organiser_status text,
    organiser_approved_at timestamp with time zone,
    organiser_payment_methods jsonb,
    country text,
    organiser_role text,
    tags text[] DEFAULT '{}'::text[],
    discuss_limit_override integer
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: admin_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_alerts (
    id integer NOT NULL,
    type text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    link_url text,
    related_entity_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_alerts OWNER TO postgres;

--
-- Name: admin_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_alerts_id_seq OWNER TO postgres;

--
-- Name: admin_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_alerts_id_seq OWNED BY public.admin_alerts.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    type text NOT NULL,
    level text DEFAULT 'info'::text NOT NULL,
    action text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    ip text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: blood_test_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blood_test_sessions (
    id text NOT NULL,
    telegram_username text NOT NULL,
    test_date date NOT NULL,
    lab_name text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    test_name text,
    measurement_type text,
    medication_notes text
);


ALTER TABLE public.blood_test_sessions OWNER TO postgres;

--
-- Name: blood_test_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blood_test_values (
    id text NOT NULL,
    session_id text NOT NULL,
    biomarker_name text NOT NULL,
    biomarker_category text NOT NULL,
    value numeric(12,4) NOT NULL,
    unit text NOT NULL,
    ref_range_low numeric(12,4),
    ref_range_high numeric(12,4)
);


ALTER TABLE public.blood_test_values OWNER TO postgres;

--
-- Name: bt_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bt_conversations (
    id text NOT NULL,
    telegram_username text NOT NULL,
    title text,
    messages_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bt_conversations OWNER TO postgres;

--
-- Name: compound_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compound_logs (
    id text NOT NULL,
    telegram_username text NOT NULL,
    compound_name text NOT NULL,
    compound_type text NOT NULL,
    dose_amount numeric(10,3) NOT NULL,
    dose_unit text NOT NULL,
    frequency text NOT NULL,
    route text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.compound_logs OWNER TO postgres;

--
-- Name: custom_couriers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_couriers (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    tracking_url_template text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.custom_couriers OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    telegram_username text NOT NULL,
    full_name text,
    email text,
    phone text,
    address text,
    account_status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: delivery_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_methods (
    id text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.delivery_methods OWNER TO postgres;

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id integer NOT NULL,
    type text DEFAULT 'feedback'::text NOT NULL,
    message text NOT NULL,
    telegram_username text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_id_seq OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: fs3_costs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fs3_costs (
    id integer NOT NULL,
    product_name text NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fs3_costs OWNER TO postgres;

--
-- Name: fs3_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fs3_costs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fs3_costs_id_seq OWNER TO postgres;

--
-- Name: fs3_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fs3_costs_id_seq OWNED BY public.fs3_costs.id;


--
-- Name: gb_waitlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gb_waitlist (
    id text NOT NULL,
    group_buy_id text NOT NULL,
    account_id text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone
);


ALTER TABLE public.gb_waitlist OWNER TO postgres;

--
-- Name: glp1_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.glp1_logs (
    id text NOT NULL,
    telegram_username text NOT NULL,
    logged_date date NOT NULL,
    compound_name text NOT NULL,
    dose_mg numeric(8,3) NOT NULL,
    weight_kg numeric(8,3),
    weight_unit text DEFAULT 'kg'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    injection_site text,
    side_effects text,
    calories integer,
    protein_g integer,
    water_ml integer
);


ALTER TABLE public.glp1_logs OWNER TO postgres;

--
-- Name: group_buy_delivery_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_buy_delivery_methods (
    id text NOT NULL,
    group_buy_id text NOT NULL,
    delivery_method_id text NOT NULL
);


ALTER TABLE public.group_buy_delivery_methods OWNER TO postgres;

--
-- Name: group_buy_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_buy_products (
    id text NOT NULL,
    group_buy_id text NOT NULL,
    product_id text NOT NULL,
    price_override numeric(10,2),
    active boolean DEFAULT true NOT NULL,
    sort_order integer
);


ALTER TABLE public.group_buy_products OWNER TO postgres;

--
-- Name: group_buys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_buys (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    close_date timestamp with time zone,
    invite_pin_hash text,
    manufacturer text,
    manufacturer_country text,
    info_cards text,
    currency text DEFAULT 'GBP'::text NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping_options text,
    lab_test_supplier text,
    testing_enabled boolean DEFAULT false NOT NULL,
    vendor_shipping_enabled boolean DEFAULT false NOT NULL,
    vendor_shipping_message text,
    payment_message_enabled boolean DEFAULT false NOT NULL,
    payment_message text,
    payments_enabled boolean DEFAULT true NOT NULL,
    member_limit integer,
    min_members integer,
    organiser_id text,
    approval_status text,
    organiser_payments jsonb,
    pnl_costs jsonb,
    allowed_countries jsonb,
    excluded_countries jsonb,
    vendor_shipping_amount numeric(10,2),
    admin_fee_enabled boolean DEFAULT false NOT NULL,
    admin_fee_amount numeric(10,2),
    admin_fee_label text
);


ALTER TABLE public.group_buys OWNER TO postgres;

--
-- Name: lab_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_tests (
    id integer NOT NULL,
    janoshik_id text,
    url text,
    peptide_name text NOT NULL,
    mg_amount real,
    supplier text DEFAULT 'Uther'::text,
    batch_code text,
    purity_pct real,
    endotoxin_eu_mg real,
    sterility_pass boolean,
    test_date text,
    notes text,
    is_third_party_test boolean DEFAULT false NOT NULL,
    pending boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    lab_name text,
    test_type text,
    product_category text,
    heavy_metal_as text,
    heavy_metal_cd text,
    heavy_metal_pb text,
    heavy_metal_hg text,
    submitted_by text,
    ai_extracted boolean DEFAULT false NOT NULL,
    ai_extracted_at timestamp without time zone,
    organiser_id text,
    group_buy_id text,
    mass_unit text DEFAULT 'mg'::text
);


ALTER TABLE public.lab_tests OWNER TO postgres;

--
-- Name: lab_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_tests_id_seq OWNER TO postgres;

--
-- Name: lab_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_tests_id_seq OWNED BY public.lab_tests.id;


--
-- Name: lookup_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lookup_attempts (
    id text NOT NULL,
    identifier text NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    blocked_until timestamp with time zone,
    last_attempt_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lookup_attempts OWNER TO postgres;

--
-- Name: order_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_line_items (
    id text NOT NULL,
    order_id text NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_total numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_oos boolean DEFAULT false NOT NULL
);


ALTER TABLE public.order_line_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id text NOT NULL,
    code text NOT NULL,
    telegram_username text NOT NULL,
    delivery_method text NOT NULL,
    delivery_method_id text DEFAULT ''::text NOT NULL,
    delivery_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    vendor_shipping numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    product_subtotal numeric(10,2) NOT NULL,
    tip numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    grand_total numeric(10,2) NOT NULL,
    notes text,
    status text DEFAULT 'Submitted'::text NOT NULL,
    admin_notes text,
    admin_message text,
    tracking_number text,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    payment_tx_hash text,
    payment_test_amount numeric(10,2),
    test_payment_tx_hash text,
    shipping_name text,
    shipping_address text,
    pin text DEFAULT '0000'::text NOT NULL,
    inpost_qr_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_buy_id text,
    testing_contribution text,
    test_vote text,
    refund_status text,
    refund_reason text,
    refunded_at timestamp with time zone,
    payment_rejection_reason text
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: organiser_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organiser_audit_log (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    admin_username text NOT NULL,
    organiser_username text NOT NULL,
    action_type text NOT NULL,
    previous_value text,
    new_value text,
    CONSTRAINT organiser_audit_log_action_type_check CHECK ((action_type = ANY (ARRAY['status_change'::text, 'role_change'::text])))
);


ALTER TABLE public.organiser_audit_log OWNER TO postgres;

--
-- Name: plotter_cycles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plotter_cycles (
    id text NOT NULL,
    telegram_username text NOT NULL,
    entries_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_weeks integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plotter_cycles OWNER TO postgres;

--
-- Name: postage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postage (
    id text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.postage OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    category text,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_group_buy_id text,
    vendor text DEFAULT 'Uther'::text NOT NULL,
    stock integer,
    low_stock_threshold integer,
    organiser_id text,
    mg_size text
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipments (
    id text NOT NULL,
    label text NOT NULL,
    carrier text DEFAULT 'Auto'::text NOT NULL,
    tracking_number text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    status_code integer DEFAULT 0,
    origin text DEFAULT 'China'::text NOT NULL,
    estimated_delivery text,
    cached_events text DEFAULT '[]'::text,
    last_checked timestamp without time zone,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shipments OWNER TO postgres;

--
-- Name: site_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_config (
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.site_config OWNER TO postgres;

--
-- Name: vial_discount_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vial_discount_codes (
    id text NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2),
    max_uses integer,
    uses_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vial_discount_codes OWNER TO postgres;

--
-- Name: vial_manufacturers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vial_manufacturers (
    id text NOT NULL,
    name text NOT NULL,
    country text,
    website text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vial_manufacturers OWNER TO postgres;

--
-- Name: vial_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vial_order_items (
    id text NOT NULL,
    order_id text NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_total numeric(10,2) NOT NULL
);


ALTER TABLE public.vial_order_items OWNER TO postgres;

--
-- Name: vial_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vial_orders (
    id text NOT NULL,
    code text NOT NULL,
    telegram_username text NOT NULL,
    shipping_name text,
    shipping_address text,
    email text,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) NOT NULL,
    discount_code_id text,
    discount_code_used text,
    order_status text DEFAULT 'accepted'::text NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    payment_tx_hash text,
    wallet_address text,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vial_orders OWNER TO postgres;

--
-- Name: vial_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vial_products (
    id text NOT NULL,
    vendor_id text,
    name text NOT NULL,
    description text,
    category text,
    mg_size text,
    price numeric(10,2) NOT NULL,
    currency text DEFAULT 'USDT'::text NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    manufacturer text,
    batch_number text,
    lab_report_url text,
    image_url text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vial_products OWNER TO postgres;

--
-- Name: vial_vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vial_vendors (
    id text NOT NULL,
    name text NOT NULL,
    tagline text,
    description text,
    contact_telegram text,
    telegram_chat_id text,
    logo_url text,
    ships_to text,
    country text,
    rating numeric(3,2),
    seller_password_hash text,
    wallet_address text,
    revolut_link text,
    paypal_link text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reset_code text,
    reset_code_expires_at timestamp with time zone
);


ALTER TABLE public.vial_vendors OWNER TO postgres;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: admin_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_alerts ALTER COLUMN id SET DEFAULT nextval('public.admin_alerts_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: fs3_costs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fs3_costs ALTER COLUMN id SET DEFAULT nextval('public.fs3_costs_id_seq'::regclass);


--
-- Name: lab_tests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_tests ALTER COLUMN id SET DEFAULT nextval('public.lab_tests_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	793a0520417a138f37f672efd291b1bdba075078265682d7c80859a869c66777	1774214197583
2	b79ffe300e8de735f5b322468fb23e0cebee5451045b6f23fb07a476a2ad3d3d	1774216442621
3	11d3cb18a6f074ff5ffd83e4dcb68841d728a32e1ae970c5a9923f816c0e5625	1774442401705
4	7c0d2350640b08a820fdb412d9ba633851335b7e2c122e8cb6d80eb28054efb9	1775427800692
5	8181fcc11546117e3dacf96cf0fd035dff43460da37fe347853fd73f1fabbdf1	1775942400000
6	07ec1f80188f4683ea34ba7f23f70b9cc16a2d03bb3d1161cc7a27da427ccf03	1776028800000
7	a6df1746c96dabc9e324a66744bac38ad646e835a3d81770b1971af9ba877e24	1776258000000
\.


--
-- Data for Name: account_group_buys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_group_buys (id, account_id, group_buy_id, joined_at, tags) FROM stdin;
a8eb4079-38b0-44c8-8c56-dafeb9205307	penman123	BBXDR	2026-04-12 21:08:21.20326+00	[]
e1697ba2-c2dc-42a0-9ebb-f6d7b88a6f24	penman123	H64PT	2026-04-12 21:15:38.448071+00	[]
300d5f8f-99b7-4774-aea3-bea4687446f2	iam0121	P43JH	2026-04-13 11:50:51.655899+00	[]
13f51762-54d9-4bff-a18d-6b8d8e0cbd56	iam0121	H64PT	2026-04-13 12:36:22.072854+00	[]
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (telegram_username, password_hash, email, account_status, telegram_chat_id, telegram_notifications, telegram_link_token, telegram_link_expires_at, created_at, updated_at, health_data_consent, discuss_count, reset_code, reset_code_expires_at, organiser_status, organiser_approved_at, organiser_payment_methods, country, organiser_role, tags, discuss_limit_override) FROM stdin;
atzz_mm	$2b$12$i0sut3543C/QU.opNjigruqP5gY2brOja2MuO4K91IsXmc8ROixTO	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 17:48:14.148+00	2026-03-24 17:48:14.148+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
fergmcferg	$2b$12$7WhfxQa/Jt/w7JOJuxwRQeT2aVV/ZUXSNlcS7xu8HrVYxIX7I8br2	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 09:39:36.74+00	2026-03-24 09:39:36.74+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
hotlinerider	$2b$12$o6nGDeAAP4YslNTIj2aAVeqfqdtD8WypKMShUZhzz.yf4O3Ak6oiS	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-25 09:21:19.46+00	2026-03-25 09:21:19.46+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
ironmanjamie	$2b$12$DbAXkQ76b2mtB1IMQuxmSutQW/f0ISMaBJDWT.KKAwnNvBqSubWsq	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 06:59:09.254+00	2026-03-24 06:59:09.254+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
jack3797	$2b$12$f6elbsU3NPrUzd0wAQdwCOzTRx2vwDlwLIUWo2rTPop82B5d9Nb.2	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-25 07:28:22.276+00	2026-03-25 07:28:22.276+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
jbonwards	\N	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 14:23:42.01+00	2026-03-24 14:23:42.01+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
sicoted	$2b$12$2oTqZW59Wo.JP5Uk2G39g.oM6r5RaRPR2sd.Hu36SQNZbq5duZi06	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 20:40:45.943+00	2026-03-24 20:40:45.943+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
simonayybee	$2b$12$OcXhrLLd5kx1qcauzK6i..HzDXvHnp18AxGE896tAU8VBvuhVQTZy	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 18:07:30.69+00	2026-03-24 18:07:30.69+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
untamedchazy	\N	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-25 04:36:03.131+00	2026-03-25 04:36:03.131+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
vasendak	$2b$12$yY8tS0PwDk05PX4w5SgHQepiSCrRfA9ccASvG7GdxpLCDcI3EUTYC	\N	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-03-24 13:59:07.39+00	2026-03-24 13:59:07.39+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
sleepingpep	$2b$12$SHB74F0w8ouuN5C9QifItedKvLH5EVo1qGaMWgJfWz6HVm4amNDmm	pep@gmail.com	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-04-11 10:47:37.049406+00	2026-04-11 10:47:37.049406+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
testing1	$2b$12$QQYS4gXVT2xwUNf11x1Iye6sBR2Wtm/Q11dS6bQ1QRnVDT2dTMNnq	testing1@gmail.com	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-04-12 07:40:45.022031+00	2026-04-12 07:40:45.022031+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
testing123	$2b$12$BOK.dp4x1jK4TRRWh.6kOefsL8ZKVbcxjR.Qh5RofhMwuaF2tPqg2	test@penman.com	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-04-12 20:46:25.348567+00	2026-04-12 20:46:25.348567+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
testing1234	$2b$12$eb3GGimnSpxTodr2SXUTF.QA1ihZ0AmSa/wdJAm6Mbim0oeSzxEnG	test@mail.com	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-04-12 20:47:33.241236+00	2026-04-12 20:47:33.241236+00	f	0	\N	\N	\N	\N	\N	\N	\N	{}	\N
penman123	$2b$12$.FLM4w2qYjYS3oc/N8jo2uAb.IeGLTNHkeR5l7TUDc2iADZniCMsC	pen@pen.com	active	\N	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	5103CCC1	2026-04-12 21:37:52.515+00	2026-04-12 20:59:48.68761+00	2026-04-12 21:35:59.955+00	f	3	\N	\N	\N	\N	\N	\N	\N	{}	\N
iam0121	$2b$12$bCJTM/bRwqNBh4xc6XlLr.kx6.K6vfy1PzlPSRKITA4lzRSX54FUq	\N	active	7589992744	{"status": true, "deleted": true, "payment": true, "profile": true, "new_order": true}	\N	\N	2026-04-05 14:08:11.322+00	2026-04-13 19:08:44.623+00	f	5	\N	\N	approved	2026-04-13 07:15:18.11+00	\N	United Kingdom	\N	{}	\N
\.


--
-- Data for Name: admin_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_alerts (id, type, priority, title, message, is_read, link_url, related_entity_id, created_at) FROM stdin;
1	order	high	New Order	New order #7884 placed by @carpediem831 — $72.50	t	#orders:ef424a02-1925-4f55-949b-4b714f5c7cbc	ef424a02-1925-4f55-949b-4b714f5c7cbc	2026-03-24 10:34:43.385+00
2	order	medium	Order Cancelled	Order #6130 was cancelled	t	#orders	074ac35a-81ad-4d06-8e43-c2cbd76a1ea5	2026-03-24 12:11:20.841+00
3	order	high	New Order	New order #6056 placed by @ironmanjamie — $1087.50	t	#orders:56b0fc96-fb0a-4894-90e6-b0155adc13b2	56b0fc96-fb0a-4894-90e6-b0155adc13b2	2026-03-25 14:56:25.976+00
4	order	medium	Order Cancelled	Order #3169 was cancelled	t	#orders	2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de	2026-03-26 13:55:07.935+00
5	order	high	New Order	New order #8583 placed by @mkp_uk — $123.00	t	#orders:f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93	f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93	2026-03-27 13:20:48.831+00
6	order	high	New Order	New order #9360 placed by @ploddingalong — $971.00	f	#orders:d6cb9628-82e3-42e1-a9b0-7dc044c79837	d6cb9628-82e3-42e1-a9b0-7dc044c79837	2026-03-27 13:37:54.381+00
7	order	medium	Order Cancelled	Order #0021 was cancelled	t	#orders	e8b38f59-85d4-4c03-9581-eca90f3bf35f	2026-03-28 10:47:38.263+00
8	order	high	New Order	New order #5168 placed by @grundlefly1 — $303.00	f	#orders:4e4a3e91-871e-4486-8b8e-828a75cd40f1	4e4a3e91-871e-4486-8b8e-828a75cd40f1	2026-03-29 10:36:07.104+00
9	order	medium	Order Cancelled	Order #9360 was cancelled	t	#orders	d6cb9628-82e3-42e1-a9b0-7dc044c79837	2026-03-31 18:33:40.589+00
10	order	high	New Order	New order #7064 placed by @test — $168.00	f	#orders:2cea936c-6a34-46ca-8903-939aa73fbf76	2cea936c-6a34-46ca-8903-939aa73fbf76	2026-04-10 11:39:37.839846+00
11	order	high	New Order	New order #6110 placed by @testing — $90.00	t	#orders:a6ba6cbb-4a5d-4674-b422-4b45e96481a1	a6ba6cbb-4a5d-4674-b422-4b45e96481a1	2026-04-10 17:51:34.726958+00
12	order	high	New Order	New order #6633 placed by @iam0121 — $90.00	f	#orders:8e2d911c-ddbd-4f96-b25c-620288e64291	8e2d911c-ddbd-4f96-b25c-620288e64291	2026-04-10 19:54:30.409598+00
13	order	high	Payment Received	Payment received for order #6633 — $90.00	f	#orders:8e2d911c-ddbd-4f96-b25c-620288e64291	8e2d911c-ddbd-4f96-b25c-620288e64291	2026-04-10 20:31:52.507049+00
14	order	low	Order Updated	Order #6633 was manually updated by admin	f	#orders:8e2d911c-ddbd-4f96-b25c-620288e64291	8e2d911c-ddbd-4f96-b25c-620288e64291	2026-04-11 00:08:40.281499+00
15	order	high	New Order	New order #8791 placed by @sleepingpep — $355.00	f	#orders:ffece4fb-67d7-443a-8a9d-48340b0d640c	ffece4fb-67d7-443a-8a9d-48340b0d640c	2026-04-11 10:54:51.134988+00
16	order	high	New Order	New order #7164 placed by @sleepingpep — $355.00	f	#orders:69c2436a-82e4-4306-ad13-bf8e8678698f	69c2436a-82e4-4306-ad13-bf8e8678698f	2026-04-11 11:35:46.810828+00
17	seller	high	New Seller Application	Van (@entangledpep) has submitted a seller application and is awaiting review.	t	#vialshop	aa0c2358-d0e8-4e02-9297-887c90283b54	2026-04-11 11:53:36.592976+00
18	order	high	New Order	New order #6427 placed by @iam0121 — $95.00	f	#orders:e620d4f8-f1d3-435e-adc8-1d58e91f6109	e620d4f8-f1d3-435e-adc8-1d58e91f6109	2026-04-12 06:46:59.244559+00
19	order	high	New Order	New order #4958 placed by @testing1 — $175.00	f	#orders:dbcc120d-0908-42b9-b772-68c2a70246b1	dbcc120d-0908-42b9-b772-68c2a70246b1	2026-04-12 09:08:10.10759+00
20	order	high	New Order	New order #2846 placed by @testing1 — $70.00	f	#orders:75892d30-9506-4ea1-ab7d-8cc89107364f	75892d30-9506-4ea1-ab7d-8cc89107364f	2026-04-12 09:14:44.31155+00
21	order	high	New Order	New order #7286 placed by @testing1 — $75.00	f	#orders:7c8bddfd-8987-4ecf-a7be-0b60c92d42c4	7c8bddfd-8987-4ecf-a7be-0b60c92d42c4	2026-04-12 09:16:07.904337+00
22	order	high	New Order	New order #3341 placed by @penman123 — $105.00	t	#orders:e534aa02-2195-4922-8bda-08cdbe653ff6	e534aa02-2195-4922-8bda-08cdbe653ff6	2026-04-12 21:19:10.097132+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, type, level, action, message, metadata, ip, created_at) FROM stdin;
1	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-20 09:38:19.343+00
2	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "34.28.115.107"}	34.28.115.107	2026-03-20 09:38:30.525+00
3	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.193.3.192"}	35.193.3.192	2026-03-20 09:38:32.734+00
4	order	info	order_updated_by_admin	Admin updated order 0043 (Clarke): pin	{"code": "0043", "changes": {"pin": "1234"}, "orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "telegramUsername": "Clarke"}	35.227.80.228	2026-03-20 09:38:50.566+00
5	login	info	admin_login_success	Admin logged in successfully	{"ip": "136.111.227.54"}	136.111.227.54	2026-03-20 09:40:50.927+00
6	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 4}	35.190.148.147	2026-03-20 10:16:03.88+00
7	login	warn	lookup_failed	Failed order lookup for identifier: @mkp-ik	{"blocked": false, "identifier": "@mkp-ik", "failedAttempts": 1}	35.190.148.147	2026-03-20 10:46:07.55+00
8	login	warn	lookup_failed	Failed order lookup for identifier: @mkp-uk	{"blocked": false, "identifier": "@mkp-uk", "failedAttempts": 1}	35.190.145.24	2026-03-20 10:46:13.195+00
9	login	warn	lookup_failed	Failed order lookup for identifier: @mkp_uk	{"blocked": false, "identifier": "@mkp_uk", "failedAttempts": 1}	35.190.148.147	2026-03-20 10:46:24.049+00
10	login	warn	lookup_failed	Failed order lookup for identifier: @mkp_uk	{"blocked": false, "identifier": "@mkp_uk", "failedAttempts": 2}	35.243.247.101	2026-03-20 10:47:46.61+00
11	login	warn	lookup_failed	Failed order lookup for identifier: @mkp	{"blocked": false, "identifier": "@mkp", "failedAttempts": 1}	35.243.247.101	2026-03-20 10:50:41.348+00
12	order	info	order_created	New order 5485 created by @mkp_uk (InPost, total: 168.00)	{"code": "5485", "orderId": "6c5bc992-e88b-4a57-b293-4d94ba7e6ced", "grandTotal": "168.00", "deliveryMethod": "InPost", "telegramUsername": "@mkp_uk"}	35.196.201.235	2026-03-20 10:53:57.654+00
13	login	warn	lookup_failed	Failed order lookup for identifier: johncenacme	{"blocked": false, "identifier": "johncenacme", "failedAttempts": 1}	34.10.2.232	2026-03-20 10:54:03.753+00
14	login	warn	lookup_failed	Failed order lookup for identifier: @johncenacme	{"blocked": false, "identifier": "@johncenacme", "failedAttempts": 2}	34.10.2.232	2026-03-20 10:54:11.055+00
15	login	info	lookup_success	Successful order lookup for @mkp_uk (order 5485)	{"orderId": "6c5bc992-e88b-4a57-b293-4d94ba7e6ced", "orderCode": "5485", "identifier": "@mkp_uk", "telegramUsername": "@mkp_uk"}	35.227.80.228	2026-03-20 10:54:27.42+00
16	order	warn	order_deleted_by_customer	Customer deleted order 5485 (@mkp_uk, status: Submitted)	{"code": "5485", "status": "Submitted", "orderId": "6c5bc992-e88b-4a57-b293-4d94ba7e6ced", "telegramUsername": "@mkp_uk"}	34.23.146.22	2026-03-20 10:54:42.135+00
17	login	warn	lookup_failed	Failed order lookup for identifier: @johncenacme	{"blocked": false, "identifier": "@johncenacme", "failedAttempts": 3}	34.23.116.255	2026-03-20 10:56:13.536+00
18	login	warn	lookup_failed	Failed order lookup for identifier: @johncenacme	{"blocked": false, "identifier": "@johncenacme", "failedAttempts": 4}	34.148.7.61	2026-03-20 10:56:18.668+00
19	login	warn	lookup_failed	Failed order lookup for identifier: johncenacme	{"blocked": false, "identifier": "johncenacme", "failedAttempts": 2}	35.231.191.228	2026-03-20 10:56:23.962+00
20	login	warn	lookup_failed	Failed order lookup for identifier: johncenacme	{"blocked": false, "identifier": "johncenacme", "failedAttempts": 3}	35.243.247.101	2026-03-20 11:02:16.949+00
21	login	warn	lookup_failed	Failed order lookup for identifier: @miki19844	{"blocked": false, "identifier": "@miki19844", "failedAttempts": 1}	35.243.247.101	2026-03-20 11:08:12.684+00
22	login	warn	lookup_failed	Failed order lookup for identifier: miki19844	{"blocked": false, "identifier": "miki19844", "failedAttempts": 1}	35.190.145.24	2026-03-20 11:08:44.422+00
23	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-20 11:09:24.872+00
24	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-20 11:09:40.268+00
25	change	info	lockout_cleared	Admin cleared lockout for identifier: miki19844	{"identifier": "miki19844", "failedAttempts": 1}	34.148.7.61	2026-03-20 11:10:02.655+00
26	change	info	lockout_cleared	Admin cleared lockout for identifier: @miki19844	{"identifier": "@miki19844", "failedAttempts": 1}	35.227.80.228	2026-03-20 11:10:03.316+00
27	change	info	lockout_cleared	Admin cleared lockout for identifier: johncenacme	{"identifier": "johncenacme", "failedAttempts": 3}	35.231.191.228	2026-03-20 11:10:03.791+00
28	change	info	lockout_cleared	Admin cleared lockout for identifier: @johncenacme	{"identifier": "@johncenacme", "failedAttempts": 4}	34.24.36.69	2026-03-20 11:10:04.303+00
29	change	info	lockout_cleared	Admin cleared lockout for identifier: @mkp	{"identifier": "@mkp", "failedAttempts": 1}	34.148.7.61	2026-03-20 11:10:04.784+00
30	change	info	lockout_cleared	Admin cleared lockout for identifier: @mkp-uk	{"identifier": "@mkp-uk", "failedAttempts": 1}	34.148.7.61	2026-03-20 11:10:05.225+00
31	change	info	lockout_cleared	Admin cleared lockout for identifier: @mkp-ik	{"identifier": "@mkp-ik", "failedAttempts": 1}	35.231.191.228	2026-03-20 11:10:05.674+00
32	change	info	lockout_cleared	Admin cleared lockout for identifier: clarke	{"identifier": "clarke", "failedAttempts": 4}	35.231.191.228	2026-03-20 11:10:06.509+00
33	change	info	lockout_cleared	Admin cleared lockout for identifier: @lizzie2391	{"identifier": "@lizzie2391", "failedAttempts": 4}	34.148.7.61	2026-03-20 11:10:06.932+00
34	change	info	lockout_cleared	Admin cleared lockout for identifier: lizzie2391	{"identifier": "lizzie2391", "failedAttempts": 3}	34.148.7.61	2026-03-20 11:10:07.35+00
35	change	warn	all_lockouts_cleared	Admin cleared all login lockouts	{}	34.23.146.22	2026-03-20 11:10:08.754+00
36	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	34.24.36.69	2026-03-20 11:10:44.814+00
37	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-20 11:10:54.287+00
38	login	info	pin_changed	PIN changed for @adev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "telegramUsername": "@adev81"}	34.23.146.22	2026-03-20 11:10:57.835+00
39	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.243.247.101"}	35.243.247.101	2026-03-20 11:11:26.75+00
40	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.135.198.110"}	34.135.198.110	2026-03-20 11:12:02.628+00
41	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-20 11:12:03.393+00
42	login	info	lookup_success	Successful order lookup for @jakeh1992 (order 0009)	{"orderId": "3a5df063-138c-4498-bef2-6d733ca93ea2", "orderCode": "0009", "identifier": "@jakeh1992", "telegramUsername": "@jakeh1992"}	34.28.115.107	2026-03-20 11:12:16.782+00
43	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.135.198.110"}	34.135.198.110	2026-03-20 11:12:16.897+00
44	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.10.2.232"}	34.10.2.232	2026-03-20 11:12:17.681+00
45	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.10.2.232"}	34.10.2.232	2026-03-20 11:12:22.247+00
46	login	info	pin_changed	PIN changed for @jakeh1992 (order 0009)	{"orderId": "3a5df063-138c-4498-bef2-6d733ca93ea2", "orderCode": "0009", "telegramUsername": "@jakeh1992"}	35.193.3.192	2026-03-20 11:12:28.144+00
47	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-20 11:12:29.024+00
48	order	info	order_updated_by_admin	Admin updated order 6130 (@JohnCenaCMe): pin	{"code": "6130", "changes": {"pin": "0000"}, "orderId": "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", "telegramUsername": "@JohnCenaCMe"}	34.148.7.61	2026-03-20 11:12:57.537+00
49	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.196.201.235"}	35.196.201.235	2026-03-20 11:13:02.012+00
50	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-20 11:13:17.957+00
51	order	info	order_updated_by_admin	Admin updated order 0019 (Pink ladybug): pin	{"code": "0019", "changes": {"pin": "1234"}, "orderId": "d25da38b-20aa-40ff-ba34-e1638b380836", "telegramUsername": "Pink ladybug"}	35.231.191.228	2026-03-20 11:13:31.525+00
52	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.135.198.110"}	34.135.198.110	2026-03-20 11:13:33.438+00
53	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	35.231.191.228	2026-03-20 11:14:02.554+00
54	login	info	lookup_success	Successful order lookup for @JohnCenaCMe (order 6130)	{"orderId": "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", "orderCode": "6130", "identifier": "@johncenacme", "telegramUsername": "@JohnCenaCMe"}	34.23.146.22	2026-03-20 11:14:18.123+00
55	login	info	pin_changed	PIN changed for @johncenacme (order 6130)	{"orderId": "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", "orderCode": "6130", "telegramUsername": "@johncenacme"}	34.23.146.22	2026-03-20 11:14:39.416+00
56	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-20 11:15:00.091+00
57	login	info	lookup_success	Successful order lookup for @jakeh1992 (order 0009)	{"orderId": "3a5df063-138c-4498-bef2-6d733ca93ea2", "orderCode": "0009", "identifier": "@jakeh1992", "telegramUsername": "@jakeh1992"}	35.196.201.235	2026-03-20 11:15:41.239+00
58	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-20 11:16:19.215+00
59	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-20 11:16:19.994+00
60	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-20 11:17:21.546+00
61	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-20 11:17:22.945+00
62	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 1}	35.193.3.192	2026-03-20 11:19:16.383+00
63	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 2}	35.193.3.192	2026-03-20 11:19:21.4+00
64	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 3}	136.111.227.54	2026-03-20 11:19:24.612+00
65	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.10.2.232"}	34.10.2.232	2026-03-20 11:20:02.195+00
66	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.135.198.110"}	34.135.198.110	2026-03-20 11:20:02.468+00
67	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 4}	34.23.116.255	2026-03-20 11:20:06.771+00
68	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.10.2.232"}	34.10.2.232	2026-03-20 11:20:10.486+00
69	change	info	lockout_cleared	Admin cleared lockout for identifier: clarke	{"identifier": "clarke", "failedAttempts": 4}	35.231.191.228	2026-03-20 11:20:16.707+00
70	order	info	order_updated_by_admin	Admin updated order 0043 (Clarke): pin	{"code": "0043", "changes": {"pin": "1234"}, "orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "telegramUsername": "Clarke"}	34.23.116.255	2026-03-20 11:20:25.009+00
71	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 1}	34.23.116.255	2026-03-20 11:20:27.172+00
72	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-20 11:20:29.241+00
73	order	info	order_updated_by_admin	Admin updated order 0043 (Clarke): telegramUsername	{"code": "0043", "changes": {"telegramUsername": "clarke"}, "orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "telegramUsername": "Clarke"}	34.148.7.61	2026-03-20 11:20:36.935+00
74	login	warn	lookup_failed	Failed order lookup for identifier: clarke	{"blocked": false, "identifier": "clarke", "failedAttempts": 2}	35.190.145.24	2026-03-20 11:20:41.63+00
75	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.243.247.101"}	35.243.247.101	2026-03-20 11:20:45.202+00
76	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.190.148.147"}	35.190.148.147	2026-03-20 11:20:55.348+00
77	login	info	lookup_success	Successful order lookup for clarke (order 0043)	{"orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "orderCode": "0043", "identifier": "0043", "telegramUsername": "clarke"}	35.231.191.228	2026-03-20 11:21:00.158+00
78	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-20 11:21:14.542+00
79	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.10.2.232"}	34.10.2.232	2026-03-20 11:21:15.455+00
80	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-20 11:21:20.77+00
81	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.45.168.209"}	34.45.168.209	2026-03-20 11:21:40.043+00
82	login	info	lookup_success	Successful order lookup for clarke (order 0043)	{"orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "orderCode": "0043", "identifier": "0043", "telegramUsername": "clarke"}	35.190.145.24	2026-03-20 11:21:50.949+00
83	login	info	lookup_success	Successful order lookup for clarke (order 0043)	{"orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "orderCode": "0043", "identifier": "0043", "telegramUsername": "clarke"}	34.10.2.232	2026-03-20 11:22:45.147+00
84	login	warn	lookup_failed	Failed order lookup for identifier: @pink ladybug	{"blocked": false, "identifier": "@pink ladybug", "failedAttempts": 1}	35.227.80.228	2026-03-20 11:25:12.27+00
85	login	warn	lookup_failed	Failed order lookup for identifier: pink ladybug	{"blocked": false, "identifier": "pink ladybug", "failedAttempts": 1}	35.227.80.228	2026-03-20 11:25:23.972+00
86	login	warn	lookup_failed	Failed order lookup for identifier: @pink ladybug	{"blocked": false, "identifier": "@pink ladybug", "failedAttempts": 2}	34.23.146.22	2026-03-20 11:26:56.658+00
87	login	warn	lookup_failed	Failed order lookup for identifier: @pink ladybug	{"blocked": false, "identifier": "@pink ladybug", "failedAttempts": 3}	34.148.7.61	2026-03-20 11:29:03.883+00
88	login	warn	lookup_failed	Failed order lookup for identifier: pink ladybug	{"blocked": false, "identifier": "pink ladybug", "failedAttempts": 2}	34.148.7.61	2026-03-20 11:29:09.279+00
89	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "@zebble76", "telegramUsername": "@zebble76"}	35.196.201.235	2026-03-20 11:29:42.004+00
90	login	warn	lookup_failed	Failed order lookup for identifier: pink ladybug	{"blocked": false, "identifier": "pink ladybug", "failedAttempts": 3}	34.23.146.22	2026-03-20 11:30:02.543+00
91	login	warn	lookup_failed	Failed order lookup for identifier: pink ladybug	{"blocked": false, "identifier": "pink ladybug", "failedAttempts": 4}	35.227.80.228	2026-03-20 11:30:06.257+00
92	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-20 11:30:10.022+00
93	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-20 11:30:28.7+00
94	change	info	lockout_cleared	Admin cleared lockout for identifier: pink ladybug	{"identifier": "pink ladybug", "failedAttempts": 4}	34.24.36.69	2026-03-20 11:30:33.922+00
95	change	info	lockout_cleared	Admin cleared lockout for identifier: @pink ladybug	{"identifier": "@pink ladybug", "failedAttempts": 3}	35.227.80.228	2026-03-20 11:30:36.053+00
96	change	info	lockout_cleared	Admin cleared lockout for identifier: clarke	{"identifier": "clarke", "failedAttempts": 2}	34.24.36.69	2026-03-20 11:30:38.193+00
97	login	warn	lookup_failed	Failed order lookup for identifier: @pink ladybug	{"blocked": false, "identifier": "@pink ladybug", "failedAttempts": 1}	34.23.146.22	2026-03-20 11:31:25.422+00
98	login	warn	lookup_failed	Failed order lookup for identifier: @fergmcferg	{"blocked": false, "identifier": "@fergmcferg", "failedAttempts": 1}	34.135.198.110	2026-03-20 11:32:06.013+00
99	login	info	lookup_success	Successful order lookup for Pink ladybug (order 0019)	{"orderId": "d25da38b-20aa-40ff-ba34-e1638b380836", "orderCode": "0019", "identifier": "0019", "telegramUsername": "Pink ladybug"}	34.24.36.69	2026-03-20 11:32:08.045+00
100	order	info	order_created	New order 6064 created by @test8689 (Royal Mail, total: 75.00)	{"code": "6064", "orderId": "1c6f6f7f-e7bd-4124-bc95-87988338970c", "grandTotal": "75.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@test8689"}	35.243.247.101	2026-03-20 11:32:21.626+00
101	login	info	lookup_success	Successful order lookup for @test8689 (order 6064)	{"orderId": "1c6f6f7f-e7bd-4124-bc95-87988338970c", "orderCode": "6064", "identifier": "6064", "telegramUsername": "@test8689"}	35.190.145.24	2026-03-20 11:32:35.834+00
102	login	info	pin_changed	PIN changed for @test8689 (order 6064)	{"orderId": "1c6f6f7f-e7bd-4124-bc95-87988338970c", "orderCode": "6064", "telegramUsername": "@test8689"}	35.190.145.24	2026-03-20 11:32:44.765+00
103	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.28.115.107"}	34.28.115.107	2026-03-20 11:32:55.628+00
104	login	warn	lookup_failed	Failed order lookup for identifier: ferg	{"blocked": false, "identifier": "ferg", "failedAttempts": 1}	34.10.2.232	2026-03-20 11:33:22.32+00
105	login	warn	lookup_failed	Failed order lookup for identifier: fergus	{"blocked": false, "identifier": "fergus", "failedAttempts": 1}	34.10.2.232	2026-03-20 11:33:30.614+00
106	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.148.7.61"}	34.148.7.61	2026-03-20 11:34:24.982+00
107	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.190.148.147"}	35.190.148.147	2026-03-20 11:35:48.646+00
108	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-20 11:40:17.833+00
109	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-20 11:41:17.596+00
110	login	warn	lookup_failed	Failed order lookup for identifier: @prem_peps	{"blocked": false, "identifier": "@prem_peps", "failedAttempts": 1}	35.243.247.101	2026-03-20 11:48:03.375+00
111	login	warn	lookup_failed	Failed order lookup for identifier: prem_peps	{"blocked": false, "identifier": "prem_peps", "failedAttempts": 1}	35.190.148.147	2026-03-20 11:48:10.418+00
112	login	warn	lookup_failed	Failed order lookup for identifier: prem	{"blocked": false, "identifier": "prem", "failedAttempts": 1}	35.190.145.24	2026-03-20 11:48:14.871+00
113	login	warn	lookup_failed	Failed order lookup for identifier: prem_peps	{"blocked": false, "identifier": "prem_peps", "failedAttempts": 2}	35.190.148.147	2026-03-20 11:48:30.261+00
114	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-20 11:51:53.912+00
115	order	info	order_created	New order 6582 created by @prem_peps (InPost, total: 199.00)	{"code": "6582", "orderId": "73984bec-7961-4a99-9f63-fe38ebe2acc5", "grandTotal": "199.00", "deliveryMethod": "InPost", "telegramUsername": "@prem_peps"}	35.190.145.24	2026-03-20 11:53:09.655+00
116	login	warn	lookup_failed	Failed order lookup for identifier: @grundlefly	{"blocked": false, "identifier": "@grundlefly", "failedAttempts": 1}	35.243.247.101	2026-03-20 11:53:11.807+00
117	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	35.190.145.24	2026-03-20 11:53:18.558+00
118	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-20 12:00:21.557+00
119	login	warn	lookup_failed	Failed order lookup for identifier: @avayamango	{"blocked": false, "identifier": "@avayamango", "failedAttempts": 1}	34.148.7.61	2026-03-20 12:06:17.682+00
120	login	warn	lookup_failed	Failed order lookup for identifier: ray_dayer	{"blocked": false, "identifier": "ray_dayer", "failedAttempts": 1}	35.231.191.228	2026-03-20 12:30:55.846+00
121	login	warn	lookup_failed	Failed order lookup for identifier: @ray_dayer	{"blocked": false, "identifier": "@ray_dayer", "failedAttempts": 1}	34.23.116.255	2026-03-20 12:31:07.728+00
122	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.196.201.235"}	35.196.201.235	2026-03-20 12:37:48.646+00
123	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-20 12:39:19.77+00
124	login	warn	lookup_failed	Failed order lookup for identifier: prem	{"blocked": false, "identifier": "prem", "failedAttempts": 2}	34.23.146.22	2026-03-20 12:39:33.541+00
125	login	warn	lookup_failed	Failed order lookup for identifier: prem	{"blocked": false, "identifier": "prem", "failedAttempts": 3}	35.227.80.228	2026-03-20 12:39:38.045+00
126	login	warn	lookup_failed	Failed order lookup for identifier: zii	{"blocked": false, "identifier": "zii", "failedAttempts": 1}	34.135.198.110	2026-03-20 12:41:11.301+00
127	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	34.10.2.232	2026-03-20 12:41:15.829+00
128	login	warn	lookup_failed	Failed order lookup for identifier: @lizzie2391	{"blocked": false, "identifier": "@lizzie2391", "failedAttempts": 1}	35.227.80.228	2026-03-20 13:22:02.614+00
129	login	warn	lookup_failed	Failed order lookup for identifier: lizzie2391	{"blocked": false, "identifier": "lizzie2391", "failedAttempts": 1}	34.23.116.255	2026-03-20 13:22:09.539+00
130	order	info	order_created	New order 3746 created by @lizzie2391 (InPost, total: 141.00)	{"code": "3746", "orderId": "feacea3c-d137-4fb2-8955-2f154947b317", "grandTotal": "141.00", "deliveryMethod": "InPost", "telegramUsername": "@lizzie2391"}	34.23.146.22	2026-03-20 13:23:13.933+00
131	login	warn	lookup_failed	Failed order lookup for identifier: 1poundfish	{"blocked": false, "identifier": "1poundfish", "failedAttempts": 1}	35.190.145.24	2026-03-20 13:24:54.457+00
132	login	warn	lookup_failed	Failed order lookup for identifier: 1poundfish	{"blocked": false, "identifier": "1poundfish", "failedAttempts": 2}	35.190.148.147	2026-03-20 13:25:03.11+00
133	login	warn	lookup_failed	Failed order lookup for identifier: madkunt88	{"blocked": false, "identifier": "madkunt88", "failedAttempts": 1}	35.190.145.24	2026-03-20 13:25:41.242+00
134	login	warn	lookup_failed	Failed order lookup for identifier: 1poundfish	{"blocked": false, "identifier": "1poundfish", "failedAttempts": 3}	35.190.148.147	2026-03-20 13:26:01.795+00
135	login	warn	lookup_failed	Failed order lookup for identifier: @rtac26	{"blocked": false, "identifier": "@rtac26", "failedAttempts": 1}	35.196.201.235	2026-03-20 13:29:49.483+00
136	login	warn	lookup_failed	Failed order lookup for identifier: rtac26	{"blocked": false, "identifier": "rtac26", "failedAttempts": 1}	34.23.146.22	2026-03-20 13:29:54.649+00
137	login	info	lookup_success	Successful order lookup for @J4mes_R (order 0011)	{"orderId": "17b2c399-9bba-4740-8b1e-751b5baaa252", "orderCode": "0011", "identifier": "j4mes_r", "telegramUsername": "@J4mes_R"}	35.190.148.147	2026-03-20 13:31:16.06+00
138	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	34.23.116.255	2026-03-20 14:15:22.729+00
139	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 1}	35.190.148.147	2026-03-20 14:53:10.915+00
140	login	warn	lookup_failed	Failed order lookup for identifier: ploddingalong	{"blocked": false, "identifier": "ploddingalong", "failedAttempts": 1}	35.190.148.147	2026-03-20 14:53:27.68+00
141	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 2}	35.190.145.24	2026-03-20 14:54:08.895+00
142	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 3}	35.243.247.101	2026-03-20 14:54:13.546+00
143	login	warn	lookup_failed	Failed order lookup for identifier: ploddingalong	{"blocked": false, "identifier": "ploddingalong", "failedAttempts": 2}	35.190.148.147	2026-03-20 14:54:19.818+00
144	login	warn	lookup_failed	Failed order lookup for identifier: mick🇬🇧	{"blocked": false, "identifier": "mick🇬🇧", "failedAttempts": 1}	35.243.247.101	2026-03-20 14:54:51.294+00
145	login	warn	lookup_failed	Failed order lookup for identifier: ploddingalong	{"blocked": false, "identifier": "ploddingalong", "failedAttempts": 3}	35.243.247.101	2026-03-20 14:56:10.356+00
146	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 4}	35.243.247.101	2026-03-20 14:56:22.39+00
147	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": true, "identifier": "@ploddingalong", "failedAttempts": 5}	35.190.145.24	2026-03-20 14:57:10.387+00
148	login	warn	lookup_blocked	Lookup blocked for identifier: @ploddingalong after 5 failed attempts	{"identifier": "@ploddingalong", "blockedUntil": "2026-03-20T15:12:10.234Z", "failedAttempts": 5}	35.190.145.24	2026-03-20 14:57:10.433+00
149	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-20 15:54:34.424+00
150	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-20 15:54:38.087+00
151	login	warn	lookup_failed	Failed order lookup for identifier: ploddingalong	{"blocked": false, "identifier": "ploddingalong", "failedAttempts": 4}	34.138.101.97	2026-03-20 15:58:08.13+00
152	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": true, "identifier": "@ploddingalong", "failedAttempts": 6}	35.190.148.147	2026-03-20 15:58:16.317+00
153	login	warn	lookup_blocked	Lookup blocked for identifier: @ploddingalong after 6 failed attempts	{"identifier": "@ploddingalong", "blockedUntil": "2026-03-20T16:13:16.162Z", "failedAttempts": 6}	35.190.148.147	2026-03-20 15:58:16.362+00
154	login	warn	lookup_failed	Failed order lookup for identifier: mick🇬🇧	{"blocked": false, "identifier": "mick🇬🇧", "failedAttempts": 2}	34.139.93.209	2026-03-20 15:58:31.976+00
155	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-20 15:59:02.722+00
156	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.138.101.97	2026-03-20 16:01:10.63+00
157	login	warn	lookup_failed	Failed order lookup for identifier: pepboy43	{"blocked": false, "identifier": "pepboy43", "failedAttempts": 1}	34.24.160.119	2026-03-20 16:16:48.794+00
158	login	warn	lookup_failed	Failed order lookup for identifier: @pepboy43	{"blocked": false, "identifier": "@pepboy43", "failedAttempts": 1}	34.24.36.69	2026-03-20 16:16:55.276+00
159	login	info	lookup_success	Successful order lookup for @Reeper90 (order 0001)	{"orderId": "c67237d3-15ca-4487-b138-43c30d2e1df0", "orderCode": "0001", "identifier": "@reeper90", "telegramUsername": "@Reeper90"}	35.243.247.101	2026-03-20 16:49:53.66+00
160	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-20 16:50:05.17+00
161	login	info	lookup_success	Successful order lookup for @K_andL (order 0038)	{"orderId": "e00b0557-6024-42ab-826c-31d5da1e3674", "orderCode": "0038", "identifier": "k_andl", "telegramUsername": "@K_andL"}	35.231.191.228	2026-03-20 16:57:33.488+00
162	login	info	pin_changed	PIN changed for @k_andl (order 0038)	{"orderId": "e00b0557-6024-42ab-826c-31d5da1e3674", "orderCode": "0038", "telegramUsername": "@k_andl"}	35.231.191.228	2026-03-20 16:57:42.166+00
163	login	info	lookup_success	Successful order lookup for @Reeper90 (order 0001)	{"orderId": "c67237d3-15ca-4487-b138-43c30d2e1df0", "orderCode": "0001", "identifier": "@reeper90", "telegramUsername": "@Reeper90"}	35.196.201.235	2026-03-20 17:09:30.963+00
164	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	34.23.146.22	2026-03-20 17:35:13.191+00
165	login	info	pin_changed	PIN changed for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "telegramUsername": "@josie_uk"}	34.23.146.22	2026-03-20 17:35:26.467+00
166	login	info	lookup_success	Successful order lookup for @lizzie2391 (order 3746)	{"orderId": "feacea3c-d137-4fb2-8955-2f154947b317", "orderCode": "3746", "identifier": "@lizzie2391", "telegramUsername": "@lizzie2391"}	35.190.145.24	2026-03-20 17:45:30.485+00
167	login	info	lookup_success	Successful order lookup for @kenupfront (order 0016)	{"orderId": "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", "orderCode": "0016", "identifier": "@kenupfront", "telegramUsername": "@kenupfront"}	35.227.80.228	2026-03-20 17:49:32.777+00
168	order	info	order_created	New order 6399 created by @1poundfish (Royal Mail, total: 240.00)	{"code": "6399", "orderId": "bd3ef131-5462-4867-b158-096b0ab8ccf3", "grandTotal": "240.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@1poundfish"}	35.193.3.192	2026-03-20 17:58:17.625+00
169	login	warn	lookup_failed	Failed order lookup for identifier: scott	{"blocked": false, "identifier": "scott", "failedAttempts": 1}	34.10.2.232	2026-03-20 17:59:32.515+00
170	login	warn	lookup_failed	Failed order lookup for identifier: scott	{"blocked": false, "identifier": "scott", "failedAttempts": 2}	34.45.168.209	2026-03-20 17:59:37.891+00
171	login	warn	lookup_failed	Failed order lookup for identifier: scott	{"blocked": false, "identifier": "scott", "failedAttempts": 3}	35.190.145.24	2026-03-20 18:01:04.201+00
172	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": false, "identifier": "untamedchazy", "failedAttempts": 1}	34.23.146.22	2026-03-20 18:18:26.23+00
173	login	info	lookup_success	Successful order lookup for @JohnnyWalker70 (order 0007)	{"orderId": "c0a3135e-928e-4285-8916-e1f7ed71e04b", "orderCode": "0007", "identifier": "johnnywalker70", "telegramUsername": "@JohnnyWalker70"}	34.28.115.107	2026-03-20 18:18:36.866+00
174	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": false, "identifier": "untamedchazy", "failedAttempts": 2}	35.196.201.235	2026-03-20 18:18:37.639+00
175	login	info	pin_changed	PIN changed for @johnnywalker70 (order 0007)	{"orderId": "c0a3135e-928e-4285-8916-e1f7ed71e04b", "orderCode": "0007", "telegramUsername": "@johnnywalker70"}	35.223.37.203	2026-03-20 18:18:42.186+00
176	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": false, "identifier": "untamedchazy", "failedAttempts": 3}	35.227.80.228	2026-03-20 18:47:30.35+00
177	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": false, "identifier": "untamedchazy", "failedAttempts": 4}	35.196.201.235	2026-03-20 18:47:40.174+00
178	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": true, "identifier": "untamedchazy", "failedAttempts": 5}	34.24.36.69	2026-03-20 18:47:54.139+00
179	login	warn	lookup_blocked	Lookup blocked for identifier: untamedchazy after 5 failed attempts	{"identifier": "untamedchazy", "blockedUntil": "2026-03-20T19:02:53.697Z", "failedAttempts": 5}	34.24.36.69	2026-03-20 18:47:54.186+00
180	login	warn	lookup_failed	Failed order lookup for identifier: 1234	{"blocked": false, "identifier": "1234", "failedAttempts": 1}	34.24.36.69	2026-03-20 18:48:29.782+00
181	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	35.190.145.24	2026-03-20 19:32:44.406+00
182	login	warn	lookup_failed	Failed order lookup for identifier: zii	{"blocked": false, "identifier": "zii", "failedAttempts": 1}	35.243.247.101	2026-03-20 19:34:03.517+00
183	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	35.190.148.147	2026-03-20 19:34:07.135+00
184	login	warn	lookup_failed	Failed order lookup for identifier: @ssc	{"blocked": false, "identifier": "@ssc", "failedAttempts": 1}	35.190.148.147	2026-03-20 19:46:38.026+00
185	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	35.243.247.101	2026-03-20 19:46:47.973+00
186	login	info	pin_changed	PIN changed for @s s c (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "telegramUsername": "@s s c"}	35.243.247.101	2026-03-20 19:46:57.911+00
187	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	35.227.80.228	2026-03-20 19:56:30.334+00
188	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": true, "identifier": "@ploddingalong", "failedAttempts": 7}	35.227.80.228	2026-03-20 20:03:07.509+00
189	login	warn	lookup_blocked	Lookup blocked for identifier: @ploddingalong after 7 failed attempts	{"identifier": "@ploddingalong", "blockedUntil": "2026-03-20T20:18:07.341Z", "failedAttempts": 7}	35.227.80.228	2026-03-20 20:03:07.56+00
190	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": true, "identifier": "@ploddingalong", "failedAttempts": 8}	34.10.2.232	2026-03-20 20:26:06.139+00
191	login	warn	lookup_blocked	Lookup blocked for identifier: @ploddingalong after 8 failed attempts	{"identifier": "@ploddingalong", "blockedUntil": "2026-03-20T20:41:05.966Z", "failedAttempts": 8}	34.10.2.232	2026-03-20 20:26:06.191+00
192	login	warn	lookup_failed	Failed order lookup for identifier: leonidas	{"blocked": false, "identifier": "leonidas", "failedAttempts": 1}	35.196.201.235	2026-03-20 20:26:15.135+00
193	login	warn	lookup_failed	Failed order lookup for identifier: @sure_swan	{"blocked": false, "identifier": "@sure_swan", "failedAttempts": 1}	34.24.36.69	2026-03-20 20:27:27.844+00
194	login	warn	lookup_failed	Failed order lookup for identifier: sure_swan	{"blocked": false, "identifier": "sure_swan", "failedAttempts": 1}	35.196.201.235	2026-03-20 20:27:43.442+00
195	login	warn	lookup_failed	Failed order lookup for identifier: sure_swan	{"blocked": false, "identifier": "sure_swan", "failedAttempts": 2}	35.196.201.235	2026-03-20 20:28:58.747+00
196	login	warn	lookup_failed	Failed order lookup for identifier: leonidas	{"blocked": false, "identifier": "leonidas", "failedAttempts": 2}	35.196.201.235	2026-03-20 20:29:31.934+00
197	login	warn	lookup_failed	Failed order lookup for identifier: @j_p_b8_2	{"blocked": false, "identifier": "@j_p_b8_2", "failedAttempts": 1}	34.28.115.107	2026-03-20 20:54:09.741+00
198	login	warn	lookup_failed	Failed order lookup for identifier: @j_p_b8_2	{"blocked": false, "identifier": "@j_p_b8_2", "failedAttempts": 2}	34.24.36.69	2026-03-20 20:54:46.412+00
199	login	warn	lookup_failed	Failed order lookup for identifier: @johnblair	{"blocked": false, "identifier": "@johnblair", "failedAttempts": 1}	35.223.37.203	2026-03-20 20:55:01.701+00
200	login	warn	lookup_failed	Failed order lookup for identifier: @johnblair	{"blocked": false, "identifier": "@johnblair", "failedAttempts": 2}	35.193.3.192	2026-03-20 20:55:03.369+00
201	login	info	lookup_success	Successful order lookup for @John Blair (order 0028)	{"orderId": "f5fb9f44-af87-40fc-b265-b91138f1f172", "orderCode": "0028", "identifier": "@john blair", "telegramUsername": "@John Blair"}	35.193.3.192	2026-03-20 20:55:32.921+00
202	login	info	pin_changed	PIN changed for @john blair (order 0028)	{"orderId": "f5fb9f44-af87-40fc-b265-b91138f1f172", "orderCode": "0028", "telegramUsername": "@john blair"}	34.45.168.209	2026-03-20 20:55:44.909+00
203	order	info	order_created	New order 2539 created by @ploddingalong (Royal Mail, total: 410.00)	{"code": "2539", "orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "grandTotal": "410.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@ploddingalong"}	35.227.80.228	2026-03-20 21:00:07.642+00
204	login	info	lookup_success	Successful order lookup for @ploddingalong (order 2539)	{"orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "orderCode": "2539", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.148.7.61	2026-03-20 21:34:36.441+00
205	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": true, "identifier": "untamedchazy", "failedAttempts": 6}	35.196.201.235	2026-03-20 22:07:47.491+00
206	login	warn	lookup_blocked	Lookup blocked for identifier: untamedchazy after 6 failed attempts	{"identifier": "untamedchazy", "blockedUntil": "2026-03-20T22:22:47.030Z", "failedAttempts": 6}	35.196.201.235	2026-03-20 22:07:47.545+00
207	login	warn	lookup_failed	Failed order lookup for identifier: @misosososo	{"blocked": false, "identifier": "@misosososo", "failedAttempts": 1}	34.23.116.255	2026-03-20 22:33:10.213+00
208	login	info	lookup_success	Successful order lookup for Pink ladybug (order 0019)	{"orderId": "d25da38b-20aa-40ff-ba34-e1638b380836", "orderCode": "0019", "identifier": "0019", "telegramUsername": "Pink ladybug"}	35.243.247.101	2026-03-20 22:52:18.145+00
209	login	info	lookup_success	Successful order lookup for Pink ladybug (order 0019)	{"orderId": "d25da38b-20aa-40ff-ba34-e1638b380836", "orderCode": "0019", "identifier": "0019", "telegramUsername": "Pink ladybug"}	35.243.247.101	2026-03-20 22:53:24.469+00
210	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	35.243.247.101	2026-03-20 22:54:36.809+00
211	order	info	order_created	New order 5154 created by @pink ladybug (Royal Mail, total: 460.00)	{"code": "5154", "orderId": "387da382-1cae-4e68-a960-1241775d3493", "grandTotal": "460.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@pink ladybug"}	35.190.148.147	2026-03-20 22:56:01.036+00
212	login	warn	lookup_failed	Failed order lookup for identifier: @antots3	{"blocked": false, "identifier": "@antots3", "failedAttempts": 1}	34.23.146.22	2026-03-20 22:58:45.006+00
213	login	warn	lookup_failed	Failed order lookup for identifier: antots3	{"blocked": false, "identifier": "antots3", "failedAttempts": 1}	34.23.146.22	2026-03-20 22:58:51.894+00
214	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	34.23.146.22	2026-03-20 23:15:21.565+00
215	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	35.231.191.228	2026-03-21 06:30:00.242+00
216	login	info	lookup_success	Successful order lookup for @JBonwards (order 0012)	{"orderId": "f390e78f-35ca-4021-a236-a0c36532a061", "orderCode": "0012", "identifier": "@jbonwards", "telegramUsername": "@JBonwards"}	35.190.148.147	2026-03-21 06:58:16.968+00
217	login	warn	lookup_failed	Failed order lookup for identifier: untamedchazy	{"blocked": true, "identifier": "untamedchazy", "failedAttempts": 7}	35.190.145.24	2026-03-21 07:50:48.048+00
218	login	warn	lookup_blocked	Lookup blocked for identifier: untamedchazy after 7 failed attempts	{"identifier": "untamedchazy", "blockedUntil": "2026-03-21T08:05:47.863Z", "failedAttempts": 7}	35.190.145.24	2026-03-21 07:50:48.102+00
219	order	info	order_created	New order 2248 created by @untamedchazy (Royal Mail, total: 1105.00)	{"code": "2248", "orderId": "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", "grandTotal": "1105.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@untamedchazy"}	35.190.145.24	2026-03-21 07:56:05.323+00
220	login	warn	lookup_failed	Failed order lookup for identifier: hotlinerider	{"blocked": false, "identifier": "hotlinerider", "failedAttempts": 1}	34.148.7.61	2026-03-21 07:58:10.301+00
221	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	35.231.191.228	2026-03-21 07:58:14.419+00
222	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.23.116.255	2026-03-21 08:05:01.449+00
223	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.148.7.61	2026-03-21 08:05:33.845+00
224	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	35.243.247.101	2026-03-21 08:52:30.223+00
225	login	info	lookup_success	Successful order lookup for @JohnnyWalker70 (order 0007)	{"orderId": "c0a3135e-928e-4285-8916-e1f7ed71e04b", "orderCode": "0007", "identifier": "@johnnywalker70", "telegramUsername": "@JohnnyWalker70"}	35.190.148.147	2026-03-21 08:53:44.17+00
226	login	warn	lookup_failed	Failed order lookup for identifier: psychomantisxo	{"blocked": false, "identifier": "psychomantisxo", "failedAttempts": 1}	34.24.36.69	2026-03-21 09:57:41.087+00
227	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "@zebble76", "telegramUsername": "@zebble76"}	35.231.191.228	2026-03-21 10:02:32.502+00
228	login	info	lookup_success	Successful order lookup for @HAGRIDV99 (order 0021)	{"orderId": "e8b38f59-85d4-4c03-9581-eca90f3bf35f", "orderCode": "0021", "identifier": "@hagridv99", "telegramUsername": "@HAGRIDV99"}	34.45.168.209	2026-03-21 10:28:02.164+00
229	login	warn	lookup_failed	Failed order lookup for identifier: @heych91	{"blocked": false, "identifier": "@heych91", "failedAttempts": 1}	35.190.145.24	2026-03-21 10:49:24.76+00
230	login	info	lookup_success	Successful order lookup for @prem_peps (order 6582)	{"orderId": "73984bec-7961-4a99-9f63-fe38ebe2acc5", "orderCode": "6582", "identifier": "@prem_peps", "telegramUsername": "@prem_peps"}	35.190.148.147	2026-03-21 10:49:47.367+00
231	login	warn	lookup_failed	Failed order lookup for identifier: heych91	{"blocked": false, "identifier": "heych91", "failedAttempts": 1}	35.243.247.101	2026-03-21 10:50:03.216+00
232	login	info	lookup_success	Successful order lookup for @Reeper90 (order 0001)	{"orderId": "c67237d3-15ca-4487-b138-43c30d2e1df0", "orderCode": "0001", "identifier": "@reeper90", "telegramUsername": "@Reeper90"}	34.42.159.107	2026-03-21 11:00:50.413+00
233	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	35.243.247.101	2026-03-21 11:11:45.807+00
234	login	info	lookup_success	Successful order lookup for @NeverEvenSeenIt (order 0032)	{"orderId": "ed8e0967-57d6-421d-906e-8ca68e8cc3ba", "orderCode": "0032", "identifier": "@neverevenseenit", "telegramUsername": "@NeverEvenSeenIt"}	34.135.198.110	2026-03-21 12:01:53.518+00
235	login	info	lookup_success	Successful order lookup for @Jayjo8 (order 0034)	{"orderId": "83a3d960-ba23-47a3-883c-ed6883ab9d27", "orderCode": "0034", "identifier": "@jayjo8", "telegramUsername": "@Jayjo8"}	35.243.247.101	2026-03-21 12:03:28.817+00
236	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "35.193.3.192"}	35.193.3.192	2026-03-21 12:07:02.128+00
237	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.28.115.107"}	34.28.115.107	2026-03-21 12:07:06.011+00
238	change	warn	all_lockouts_cleared	Admin cleared all login lockouts	{}	34.23.146.22	2026-03-21 12:07:29.204+00
239	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-21 12:09:48.745+00
240	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.148.7.61"}	34.148.7.61	2026-03-21 12:10:44.131+00
241	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-21 12:10:46.281+00
242	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-21 12:13:28.894+00
243	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-21 12:13:32.84+00
244	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-21 12:13:36.656+00
245	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-21 12:14:50.996+00
246	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-21 12:14:51.798+00
247	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	35.190.148.147	2026-03-21 12:17:08.939+00
248	order	info	order_created	New order 1850 created by @panth89 (Royal Mail, total: 145.00)	{"code": "1850", "orderId": "f7ad2e8d-85c8-40f5-b209-089b571acdad", "grandTotal": "145.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@panth89"}	35.243.247.101	2026-03-21 12:32:09.089+00
249	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	34.23.146.22	2026-03-21 12:58:46.633+00
250	login	warn	lookup_failed	Failed order lookup for identifier: @sure_swan	{"blocked": false, "identifier": "@sure_swan", "failedAttempts": 1}	35.193.3.192	2026-03-21 13:02:35.082+00
251	order	info	order_created	New order 5237 created by @scott (Royal Mail, total: 621.00)	{"code": "5237", "orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "grandTotal": "621.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@scott"}	34.23.116.255	2026-03-21 13:04:31.69+00
252	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-21 13:11:05.323+00
253	order	info	order_updated_by_admin	Admin updated order 0042 (Leonidas): pin	{"code": "0042", "changes": {"pin": "1234"}, "orderId": "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", "telegramUsername": "Leonidas"}	34.23.116.255	2026-03-21 13:11:17.265+00
254	login	warn	lookup_failed	Failed order lookup for identifier: leonidas	{"blocked": false, "identifier": "leonidas", "failedAttempts": 1}	35.243.247.101	2026-03-21 13:12:22.787+00
255	login	warn	lookup_failed	Failed order lookup for identifier: leonidas	{"blocked": false, "identifier": "leonidas", "failedAttempts": 2}	35.243.247.101	2026-03-21 13:12:27.251+00
256	login	warn	lookup_failed	Failed order lookup for identifier: @leonidas	{"blocked": false, "identifier": "@leonidas", "failedAttempts": 1}	35.243.247.101	2026-03-21 13:12:31.918+00
257	login	warn	lookup_failed	Failed order lookup for identifier: @leonidas	{"blocked": false, "identifier": "@leonidas", "failedAttempts": 2}	35.227.80.228	2026-03-21 13:12:36.816+00
258	login	info	lookup_success	Successful order lookup for @J4mes_R (order 0011)	{"orderId": "17b2c399-9bba-4740-8b1e-751b5baaa252", "orderCode": "0011", "identifier": "j4mes_r", "telegramUsername": "@J4mes_R"}	35.196.201.235	2026-03-21 13:12:41.627+00
259	login	info	lookup_success	Successful order lookup for Leonidas (order 0042)	{"orderId": "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", "orderCode": "0042", "identifier": "0042", "telegramUsername": "Leonidas"}	34.23.146.22	2026-03-21 13:13:33.685+00
260	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.24.36.69	2026-03-21 13:57:52.853+00
261	login	warn	lookup_failed	Failed order lookup for identifier: @jord133	{"blocked": false, "identifier": "@jord133", "failedAttempts": 1}	35.231.191.228	2026-03-21 14:13:19.207+00
262	login	warn	lookup_failed	Failed order lookup for identifier: @jord133	{"blocked": false, "identifier": "@jord133", "failedAttempts": 2}	34.148.7.61	2026-03-21 14:13:28.098+00
263	login	warn	lookup_failed	Failed order lookup for identifier: jord133	{"blocked": false, "identifier": "jord133", "failedAttempts": 1}	34.148.7.61	2026-03-21 14:13:34.052+00
462	login	warn	account_login_failed	Failed login attempt for: grundlefly1	{"telegramUsername": "grundlefly1"}	35.243.247.101	2026-03-24 14:47:52.168+00
264	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.23.146.22	2026-03-21 14:15:26.851+00
265	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 1}	34.23.116.255	2026-03-21 14:25:25.995+00
266	login	info	lookup_success	Successful order lookup for @ploddingalong (order 2539)	{"orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "orderCode": "2539", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	35.231.191.228	2026-03-21 14:25:33.349+00
267	login	warn	lookup_failed	Failed order lookup for identifier: @panth89	{"blocked": false, "identifier": "@panth89", "failedAttempts": 1}	34.148.7.61	2026-03-21 14:29:15.003+00
268	login	info	lookup_success	Successful order lookup for @panth89 (order 1850)	{"orderId": "f7ad2e8d-85c8-40f5-b209-089b571acdad", "orderCode": "1850", "identifier": "@panth89", "telegramUsername": "@panth89"}	34.23.116.255	2026-03-21 14:29:19.268+00
269	login	info	lookup_success	Successful order lookup for @panth89 (order 1850)	{"orderId": "f7ad2e8d-85c8-40f5-b209-089b571acdad", "orderCode": "1850", "identifier": "@panth89", "telegramUsername": "@panth89"}	35.227.80.228	2026-03-21 14:30:11.157+00
270	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	35.231.191.228	2026-03-21 15:08:40.899+00
271	login	warn	lookup_failed	Failed order lookup for identifier: flodelpep	{"blocked": false, "identifier": "flodelpep", "failedAttempts": 1}	35.223.37.203	2026-03-21 16:28:37.051+00
272	login	warn	lookup_failed	Failed order lookup for identifier: flodelpep	{"blocked": false, "identifier": "flodelpep", "failedAttempts": 2}	35.193.3.192	2026-03-21 16:29:02.276+00
273	login	warn	lookup_failed	Failed order lookup for identifier: antots	{"blocked": false, "identifier": "antots", "failedAttempts": 1}	35.227.80.228	2026-03-21 16:32:03.868+00
274	login	warn	lookup_failed	Failed order lookup for identifier: antots3	{"blocked": false, "identifier": "antots3", "failedAttempts": 1}	35.196.201.235	2026-03-21 16:32:36.201+00
275	login	warn	lookup_failed	Failed order lookup for identifier: @antots3	{"blocked": false, "identifier": "@antots3", "failedAttempts": 1}	35.243.247.101	2026-03-21 16:32:56.719+00
276	login	info	lookup_success	Successful order lookup for @JohnnyWalker70 (order 0007)	{"orderId": "c0a3135e-928e-4285-8916-e1f7ed71e04b", "orderCode": "0007", "identifier": "@johnnywalker70", "telegramUsername": "@JohnnyWalker70"}	34.148.7.61	2026-03-21 16:45:43.264+00
277	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "@zebble76", "telegramUsername": "@zebble76"}	35.243.247.101	2026-03-21 18:50:33.783+00
278	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.148.7.61	2026-03-21 19:16:41.326+00
279	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	35.193.3.192	2026-03-21 19:36:11.169+00
280	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	35.196.201.235	2026-03-21 19:39:40.236+00
281	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	35.196.201.235	2026-03-21 19:41:22.818+00
282	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	35.190.145.24	2026-03-21 19:52:11.242+00
283	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-21 22:11:33.632+00
284	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.75.203.62"}	34.75.203.62	2026-03-21 22:12:03.993+00
285	login	info	admin_login_success	Admin logged in successfully	{"ip": "136.111.227.54"}	136.111.227.54	2026-03-21 22:15:15.529+00
286	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.45.168.209"}	34.45.168.209	2026-03-21 22:15:17.62+00
287	login	warn	lookup_failed	Failed order lookup for identifier: @heych91	{"blocked": false, "identifier": "@heych91", "failedAttempts": 1}	34.139.18.212	2026-03-21 23:26:33.337+00
288	login	warn	lookup_failed	Failed order lookup for identifier: mirculina	{"blocked": false, "identifier": "mirculina", "failedAttempts": 1}	35.190.148.147	2026-03-22 00:37:24.551+00
289	login	warn	lookup_failed	Failed order lookup for identifier: @mirculina	{"blocked": false, "identifier": "@mirculina", "failedAttempts": 1}	34.23.146.22	2026-03-22 00:37:44.768+00
290	login	warn	lookup_failed	Failed order lookup for identifier: @mirculina	{"blocked": false, "identifier": "@mirculina", "failedAttempts": 2}	34.23.146.22	2026-03-22 00:38:00.795+00
291	login	warn	lookup_failed	Failed order lookup for identifier: mirculina	{"blocked": false, "identifier": "mirculina", "failedAttempts": 2}	34.23.146.22	2026-03-22 00:38:14.319+00
292	login	warn	lookup_failed	Failed order lookup for identifier: mirculina	{"blocked": false, "identifier": "mirculina", "failedAttempts": 3}	35.190.148.147	2026-03-22 00:39:11.819+00
293	login	warn	lookup_failed	Failed order lookup for identifier: mirculina	{"blocked": false, "identifier": "mirculina", "failedAttempts": 4}	34.23.146.22	2026-03-22 00:39:19.845+00
294	login	warn	lookup_failed	Failed order lookup for identifier: mirculina	{"blocked": true, "identifier": "mirculina", "failedAttempts": 5}	34.23.146.22	2026-03-22 00:40:47.202+00
295	login	warn	lookup_blocked	Lookup blocked for identifier: mirculina after 5 failed attempts	{"identifier": "mirculina", "blockedUntil": "2026-03-22T00:55:46.769Z", "failedAttempts": 5}	34.23.146.22	2026-03-22 00:40:47.247+00
296	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	34.23.146.22	2026-03-22 07:26:18.016+00
297	login	info	lookup_success	Successful order lookup for @jakeh1992 (order 0009)	{"orderId": "3a5df063-138c-4498-bef2-6d733ca93ea2", "orderCode": "0009", "identifier": "@jakeh1992", "telegramUsername": "@jakeh1992"}	34.139.18.212	2026-03-22 07:26:19.499+00
298	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "zii", "telegramUsername": "@Zii"}	35.243.247.101	2026-03-22 07:26:42.641+00
554	login	warn	account_login_failed	Failed login attempt for: nemo	{"telegramUsername": "nemo"}	35.243.247.101	2026-03-25 10:43:34.909+00
299	login	warn	lookup_failed	Failed order lookup for identifier: @johnnywalker	{"blocked": false, "identifier": "@johnnywalker", "failedAttempts": 1}	35.227.80.228	2026-03-22 07:41:22.37+00
300	login	info	lookup_success	Successful order lookup for @JohnnyWalker70 (order 0007)	{"orderId": "c0a3135e-928e-4285-8916-e1f7ed71e04b", "orderCode": "0007", "identifier": "@johnnywalker70", "telegramUsername": "@JohnnyWalker70"}	35.231.191.228	2026-03-22 07:41:27.326+00
301	login	warn	lookup_failed	Failed order lookup for identifier: j_p_b8_2	{"blocked": false, "identifier": "j_p_b8_2", "failedAttempts": 1}	35.231.191.228	2026-03-22 08:31:30.09+00
302	order	info	order_created	New order 9904 created by @j_p_b8_2 (Royal Mail, total: 105.00)	{"code": "9904", "orderId": "2b5c150d-a993-40be-9e5a-8c284157a010", "grandTotal": "105.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@j_p_b8_2"}	34.24.36.69	2026-03-22 08:34:18.775+00
303	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	34.139.18.212	2026-03-22 09:25:41.942+00
304	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "@zebble76", "telegramUsername": "@zebble76"}	35.227.80.228	2026-03-22 10:10:58.862+00
305	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.190.148.147"}	35.190.148.147	2026-03-22 10:25:54.191+00
306	order	info	order_updated_by_admin	Admin updated order 0002 (mIRCulina): pin	{"code": "0002", "changes": {"pin": "1234"}, "orderId": "f68aa4a8-ff01-405f-bcc0-963f4e8de0c7", "telegramUsername": "mIRCulina"}	35.188.203.37	2026-03-22 10:26:17.123+00
307	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-22 10:35:07.322+00
308	login	warn	lookup_failed	Failed order lookup for identifier: @griffog	{"blocked": false, "identifier": "@griffog", "failedAttempts": 1}	35.229.16.35	2026-03-22 10:41:44.676+00
309	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-22 10:53:03.896+00
310	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.148.7.61"}	34.148.7.61	2026-03-22 10:58:45.493+00
311	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.24.36.69	2026-03-22 11:14:28.834+00
312	login	warn	lookup_failed	Failed order lookup for identifier: 002	{"blocked": false, "identifier": "002", "failedAttempts": 1}	34.135.198.110	2026-03-22 11:50:46.387+00
313	login	info	lookup_success	Successful order lookup for mIRCulina (order 0002)	{"orderId": "f68aa4a8-ff01-405f-bcc0-963f4e8de0c7", "orderCode": "0002", "identifier": "0002", "telegramUsername": "mIRCulina"}	35.223.37.203	2026-03-22 11:51:15.85+00
314	login	warn	lookup_failed	Failed order lookup for identifier: @q2w3e4r5t6y8	{"blocked": false, "identifier": "@q2w3e4r5t6y8", "failedAttempts": 1}	136.111.227.54	2026-03-22 12:31:31.861+00
315	login	warn	lookup_failed	Failed order lookup for identifier: @dmacd9	{"blocked": false, "identifier": "@dmacd9", "failedAttempts": 1}	34.139.18.212	2026-03-22 13:42:16.424+00
316	login	warn	lookup_failed	Failed order lookup for identifier: lysdexia	{"blocked": false, "identifier": "lysdexia", "failedAttempts": 1}	35.227.80.228	2026-03-22 13:43:22.747+00
317	order	info	order_created	New order 3176 created by @dmacd9 (InPost, total: 123.00)	{"code": "3176", "orderId": "6493de23-d80d-4537-b304-cbebf95d59d6", "grandTotal": "123.00", "deliveryMethod": "InPost", "telegramUsername": "@dmacd9"}	35.243.247.101	2026-03-22 13:46:23.996+00
318	login	info	lookup_success	Successful order lookup for @j_p_b8_2 (order 9904)	{"orderId": "2b5c150d-a993-40be-9e5a-8c284157a010", "orderCode": "9904", "identifier": "j_p_b8_2", "telegramUsername": "@j_p_b8_2"}	34.75.203.62	2026-03-22 14:23:41.374+00
319	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-22 16:39:53.895+00
320	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.190.148.147"}	35.190.148.147	2026-03-22 16:40:03.198+00
321	login	info	lookup_success	Successful order lookup for @panth89 (order 1850)	{"orderId": "f7ad2e8d-85c8-40f5-b209-089b571acdad", "orderCode": "1850", "identifier": "@panth89", "telegramUsername": "@panth89"}	34.23.146.22	2026-03-22 16:45:33.092+00
322	login	info	lookup_success	Successful order lookup for @1poundfish (order 6399)	{"orderId": "bd3ef131-5462-4867-b158-096b0ab8ccf3", "orderCode": "6399", "identifier": "1poundfish", "telegramUsername": "@1poundfish"}	34.75.203.62	2026-03-22 17:03:03.26+00
323	order	info	order_created	New order 6730 created by @andyt2888 (Royal Mail, total: 220.00)	{"code": "6730", "orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "grandTotal": "220.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@andyt2888"}	136.111.227.54	2026-03-22 17:06:12.019+00
324	login	info	lookup_success	Successful order lookup for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "identifier": "andyt2888", "telegramUsername": "@andyt2888"}	35.193.3.192	2026-03-22 17:06:49.402+00
325	login	info	pin_changed	PIN changed for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "telegramUsername": "@andyt2888"}	136.111.227.54	2026-03-22 17:07:10.501+00
326	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	34.23.146.22	2026-03-22 17:17:46.174+00
327	login	info	lookup_success	Successful order lookup for @1poundfish (order 6399)	{"orderId": "bd3ef131-5462-4867-b158-096b0ab8ccf3", "orderCode": "6399", "identifier": "1poundfish", "telegramUsername": "@1poundfish"}	35.243.247.101	2026-03-22 17:36:28.267+00
328	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	35.229.16.35	2026-03-22 18:15:16.703+00
329	login	info	lookup_success	Successful order lookup for @untamedchazy (order 2248)	{"orderId": "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", "orderCode": "2248", "identifier": "untamedchazy", "telegramUsername": "@untamedchazy"}	35.227.80.228	2026-03-22 18:55:00.842+00
330	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 1}	35.231.191.228	2026-03-22 18:59:50.289+00
331	login	info	lookup_success	Successful order lookup for @ploddingalong (order 2539)	{"orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "orderCode": "2539", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	35.227.80.228	2026-03-22 18:59:56.826+00
332	login	warn	lookup_failed	Failed order lookup for identifier: jack379ú	{"blocked": false, "identifier": "jack379ú", "failedAttempts": 1}	34.24.36.69	2026-03-22 20:16:37.782+00
333	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	35.231.191.228	2026-03-22 20:16:43.21+00
334	login	info	lookup_success	Successful order lookup for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "identifier": "andyt2888", "telegramUsername": "@andyt2888"}	34.75.203.62	2026-03-22 20:59:07.411+00
335	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	35.190.148.147	2026-03-22 21:00:35.528+00
336	login	info	lookup_success	Successful order lookup for @untamedchazy (order 2248)	{"orderId": "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", "orderCode": "2248", "identifier": "untamedchazy", "telegramUsername": "@untamedchazy"}	34.135.198.110	2026-03-22 21:04:08.367+00
337	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-22 21:46:28.663+00
338	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-22 21:46:31.822+00
339	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.45.168.209"}	34.45.168.209	2026-03-22 21:46:35.642+00
340	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-22 21:47:37.001+00
341	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.135.198.110"}	34.135.198.110	2026-03-22 21:48:20.121+00
342	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-22 21:49:04.3+00
343	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-22 22:32:13.753+00
344	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-22 22:32:29.101+00
345	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.229.16.35"}	35.229.16.35	2026-03-22 22:44:01.512+00
346	login	warn	lookup_failed	Failed order lookup for identifier: @fbx2000	{"blocked": false, "identifier": "@fbx2000", "failedAttempts": 1}	35.190.148.147	2026-03-23 00:30:24.056+00
347	login	warn	lookup_failed	Failed order lookup for identifier: @fbx2000	{"blocked": false, "identifier": "@fbx2000", "failedAttempts": 2}	35.190.148.147	2026-03-23 00:30:38.679+00
348	login	warn	lookup_failed	Failed order lookup for identifier: fbx2000	{"blocked": false, "identifier": "fbx2000", "failedAttempts": 1}	34.23.146.22	2026-03-23 00:30:44.648+00
349	login	warn	lookup_failed	Failed order lookup for identifier: @fbx2000	{"blocked": false, "identifier": "@fbx2000", "failedAttempts": 3}	35.243.247.101	2026-03-23 00:30:53.192+00
350	login	warn	lookup_failed	Failed order lookup for identifier: @fbx2000	{"blocked": false, "identifier": "@fbx2000", "failedAttempts": 4}	35.231.191.228	2026-03-23 00:36:53.98+00
351	login	warn	lookup_failed	Failed order lookup for identifier: @fbx2000	{"blocked": true, "identifier": "@fbx2000", "failedAttempts": 5}	34.24.36.69	2026-03-23 00:38:16.194+00
352	login	warn	lookup_blocked	Lookup blocked for identifier: @fbx2000 after 5 failed attempts	{"identifier": "@fbx2000", "blockedUntil": "2026-03-23T00:53:15.756Z", "failedAttempts": 5}	34.24.36.69	2026-03-23 00:38:16.24+00
353	login	warn	lookup_failed	Failed order lookup for identifier: 3151	{"blocked": false, "identifier": "3151", "failedAttempts": 1}	35.231.191.228	2026-03-23 00:38:53.786+00
354	login	warn	lookup_failed	Failed order lookup for identifier: fbx2000	{"blocked": false, "identifier": "fbx2000", "failedAttempts": 2}	34.24.36.69	2026-03-23 00:39:13.181+00
355	login	warn	lookup_failed	Failed order lookup for identifier: fbx2000	{"blocked": false, "identifier": "fbx2000", "failedAttempts": 3}	35.231.191.228	2026-03-23 00:39:16.594+00
356	login	info	lookup_success	Successful order lookup for Leonidas (order 0042)	{"orderId": "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", "orderCode": "0042", "identifier": "0042", "telegramUsername": "Leonidas"}	35.190.148.147	2026-03-23 06:53:39.633+00
357	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "@zebble76", "telegramUsername": "@zebble76"}	35.243.247.101	2026-03-23 07:11:23.52+00
358	login	info	lookup_success	Successful order lookup for @ploddingalong (order 2539)	{"orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "orderCode": "2539", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	35.227.80.228	2026-03-23 07:31:02.202+00
359	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.28.115.107	2026-03-23 07:33:48.951+00
360	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-23 09:02:11.941+00
361	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-23 09:32:01.369+00
362	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.193.3.192"}	35.193.3.192	2026-03-23 09:49:09.111+00
363	login	info	admin_login_success	Admin logged in successfully	{"ip": "136.111.227.54"}	136.111.227.54	2026-03-23 10:01:31.253+00
364	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.193.3.192"}	35.193.3.192	2026-03-23 10:01:34.737+00
365	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-23 10:35:34.133+00
366	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-23 10:44:07.489+00
367	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-23 10:44:12.585+00
368	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-23 10:44:36.644+00
369	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-23 10:44:44.279+00
370	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.190.148.147"}	35.190.148.147	2026-03-23 10:48:00.276+00
371	login	info	lookup_success	Successful order lookup for @ploddingalong (order 2539)	{"orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "orderCode": "2539", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.139.18.212	2026-03-23 12:01:24.461+00
372	order	warn	order_deleted_by_customer	Customer deleted order 2539 (@ploddingalong, status: Submitted)	{"code": "2539", "status": "Submitted", "orderId": "d4a33edf-f7d4-426f-84b7-57b1223d5c56", "telegramUsername": "@ploddingalong"}	35.231.191.228	2026-03-23 12:01:36.427+00
373	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 1}	34.139.18.212	2026-03-23 12:01:40.329+00
374	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "0013", "telegramUsername": "@zebble76"}	35.227.80.228	2026-03-23 17:52:49.866+00
375	login	warn	account_login_failed	Failed login attempt for: andyt2888	{"telegramUsername": "andyt2888"}	35.227.80.228	2026-03-23 20:13:05.374+00
376	login	warn	account_login_failed	Failed login attempt for: andyt2888	{"telegramUsername": "andyt2888"}	35.227.80.228	2026-03-23 20:15:24.701+00
377	login	info	lookup_success	Successful order lookup for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "identifier": "andyt2888", "telegramUsername": "@andyt2888"}	35.231.191.228	2026-03-23 20:15:52.638+00
378	login	warn	account_login_failed	Failed login attempt for: josie_uk	{"telegramUsername": "josie_uk"}	34.45.168.209	2026-03-23 21:58:52.971+00
379	login	warn	account_login_failed	Failed login attempt for: josie_uk	{"telegramUsername": "josie_uk"}	34.45.168.209	2026-03-23 21:59:31.236+00
380	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "0030", "telegramUsername": "@josie_uk"}	34.139.18.212	2026-03-23 22:00:40.339+00
381	login	warn	account_login_failed	Failed login attempt for: zii	{"telegramUsername": "zii"}	35.190.148.147	2026-03-24 06:46:30.751+00
382	login	warn	account_login_failed	Failed login attempt for: zii	{"telegramUsername": "zii"}	35.190.148.147	2026-03-24 06:46:46.645+00
383	login	warn	account_login_failed	Failed login attempt for: zii	{"telegramUsername": "zii"}	35.190.148.147	2026-03-24 06:46:54.019+00
384	login	info	account_signup	New account created: ironmanjamie	{"telegramUsername": "ironmanjamie"}	34.139.18.212	2026-03-24 06:59:09.303+00
385	login	info	account_login	Account login: ironmanjamie	{"telegramUsername": "ironmanjamie"}	35.227.80.228	2026-03-24 07:01:44.072+00
386	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-24 08:57:25.332+00
387	login	warn	account_login_failed	Failed login attempt for: fergmcferg	{"telegramUsername": "fergmcferg"}	34.139.18.212	2026-03-24 09:38:52.369+00
388	login	info	account_signup	New account created: fergmcferg	{"telegramUsername": "fergmcferg"}	34.24.36.69	2026-03-24 09:39:36.787+00
389	login	info	account_login	Account login: fergmcferg	{"telegramUsername": "fergmcferg"}	34.139.18.212	2026-03-24 09:41:27.334+00
390	login	warn	account_login_failed	Failed login attempt for: ferg	{"telegramUsername": "ferg"}	35.231.191.228	2026-03-24 09:43:42.893+00
391	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-24 09:48:58.011+00
392	login	warn	account_login_failed	Failed login attempt for: fergus	{"telegramUsername": "fergus"}	34.23.146.22	2026-03-24 09:49:52.014+00
393	login	warn	account_login_failed	Failed login attempt for: fergus	{"telegramUsername": "fergus"}	35.190.148.147	2026-03-24 09:49:59.486+00
394	login	info	lookup_success	Successful order lookup for Fergus (order 0025)	{"orderId": "0581d320-40f1-40e7-9adb-cd05ffaabda1", "orderCode": "0025", "identifier": "0025", "telegramUsername": "Fergus"}	34.148.7.61	2026-03-24 09:52:11.507+00
395	login	info	lookup_success	Successful order lookup for Fergus (order 0025)	{"orderId": "0581d320-40f1-40e7-9adb-cd05ffaabda1", "orderCode": "0025", "identifier": "0025", "telegramUsername": "Fergus"}	35.227.80.228	2026-03-24 09:54:52.608+00
396	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.148.7.61"}	34.148.7.61	2026-03-24 09:55:25.766+00
397	order	info	order_updated_by_admin	Admin updated order 0025 (Fergus): pin	{"code": "0025", "changes": {"pin": "1234"}, "orderId": "0581d320-40f1-40e7-9adb-cd05ffaabda1", "telegramUsername": "Fergus"}	35.227.80.228	2026-03-24 09:55:40.027+00
398	login	info	lookup_success	Successful order lookup for Fergus (order 0025)	{"orderId": "0581d320-40f1-40e7-9adb-cd05ffaabda1", "orderCode": "0025", "identifier": "0025", "telegramUsername": "Fergus"}	34.24.36.69	2026-03-24 09:55:55.556+00
399	login	info	lookup_success	Successful order lookup for Fergus (order 0025)	{"orderId": "0581d320-40f1-40e7-9adb-cd05ffaabda1", "orderCode": "0025", "identifier": "0025", "telegramUsername": "Fergus"}	34.75.203.62	2026-03-24 09:58:27.334+00
400	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-24 10:00:01.254+00
401	login	warn	lookup_failed	Failed order lookup for identifier: fergus	{"blocked": false, "identifier": "fergus", "failedAttempts": 1}	34.24.36.69	2026-03-24 10:00:45.689+00
402	login	info	lookup_success	Successful order lookup for Fergus (order 0025)	{"orderId": "0581d320-40f1-40e7-9adb-cd05ffaabda1", "orderCode": "0025", "identifier": "0025", "telegramUsername": "Fergus"}	34.24.36.69	2026-03-24 10:00:55.325+00
403	order	info	order_created	New order 7884 created by @carpediem831 (Royal Mail, total: 72.50)	{"code": "7884", "orderId": "ef424a02-1925-4f55-949b-4b714f5c7cbc", "grandTotal": "72.50", "deliveryMethod": "Royal Mail", "telegramUsername": "@carpediem831"}	35.229.16.35	2026-03-24 10:34:43.122+00
404	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-24 11:34:59.732+00
405	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-24 11:35:03.954+00
406	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-24 11:35:08.085+00
407	login	warn	account_login_failed	Failed login attempt for: fbx2000	{"telegramUsername": "fbx2000"}	34.24.36.69	2026-03-24 11:38:22.979+00
408	login	warn	account_login_failed	Failed login attempt for: fbx2000	{"telegramUsername": "fbx2000"}	34.148.7.61	2026-03-24 11:41:00.016+00
409	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.42.159.107"}	34.42.159.107	2026-03-24 11:45:09.647+00
410	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.190.148.147"}	35.190.148.147	2026-03-24 11:49:39.125+00
411	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-24 12:00:08.139+00
412	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-24 12:03:03.537+00
413	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.243.247.101"}	35.243.247.101	2026-03-24 12:06:54.66+00
414	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.243.247.101"}	35.243.247.101	2026-03-24 12:08:49.945+00
415	login	info	lookup_success	Successful order lookup for @JohnCenaCMe (order 6130)	{"orderId": "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", "orderCode": "6130", "identifier": "@johncenacme", "telegramUsername": "@JohnCenaCMe"}	35.229.16.35	2026-03-24 12:09:59.382+00
416	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.146.22"}	34.23.146.22	2026-03-24 12:10:05.22+00
555	login	warn	account_login_failed	Failed login attempt for: nemo	{"telegramUsername": "nemo"}	35.190.148.147	2026-03-25 10:44:38.97+00
417	order	warn	order_deleted_by_admin	Admin deleted order 0019 (Pink ladybug, status: Submitted)	{"code": "0019", "status": "Submitted", "orderId": "d25da38b-20aa-40ff-ba34-e1638b380836", "telegramUsername": "Pink ladybug"}	34.23.146.22	2026-03-24 12:10:29.999+00
418	order	warn	order_deleted_by_customer	Customer deleted order 6130 (@JohnCenaCMe, status: Submitted)	{"code": "6130", "status": "Submitted", "orderId": "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", "telegramUsername": "@JohnCenaCMe"}	35.190.148.147	2026-03-24 12:11:20.053+00
419	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.148.7.61"}	34.148.7.61	2026-03-24 12:30:40.697+00
420	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.229.16.35"}	35.229.16.35	2026-03-24 12:30:45.666+00
421	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.24.36.69"}	34.24.36.69	2026-03-24 12:31:46.042+00
422	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.227.80.228"}	35.227.80.228	2026-03-24 12:32:54.038+00
423	login	warn	account_login_failed	Failed login attempt for: zebble76	{"telegramUsername": "zebble76"}	35.243.247.101	2026-03-24 12:45:39.497+00
424	login	warn	account_login_failed	Failed login attempt for: zebble76	{"telegramUsername": "zebble76"}	35.243.247.101	2026-03-24 12:45:42.234+00
425	login	warn	account_login_failed	Failed login attempt for: zebble76	{"telegramUsername": "zebble76"}	34.23.146.22	2026-03-24 12:45:49.777+00
426	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "0013", "telegramUsername": "@zebble76"}	34.23.146.22	2026-03-24 12:46:05.343+00
427	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "0013", "telegramUsername": "@zebble76"}	35.243.247.101	2026-03-24 12:46:23.088+00
428	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	35.190.148.147	2026-03-24 13:21:47.708+00
429	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.23.146.22	2026-03-24 13:22:02.948+00
430	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.148.7.61	2026-03-24 13:22:33.642+00
431	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	35.231.191.228	2026-03-24 13:23:29.91+00
432	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.24.36.69	2026-03-24 13:23:54.71+00
433	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.229.16.35"}	35.229.16.35	2026-03-24 13:37:01.206+00
434	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.75.203.62"}	34.75.203.62	2026-03-24 13:38:37.057+00
435	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.243.247.101"}	35.243.247.101	2026-03-24 13:39:08.973+00
436	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.75.203.62"}	34.75.203.62	2026-03-24 13:43:27.71+00
437	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	136.111.227.54	2026-03-24 13:45:25.856+00
438	login	warn	account_login_failed	Failed login attempt for: jbonwards@	{"telegramUsername": "jbonwards@"}	35.229.16.35	2026-03-24 13:47:24.215+00
439	login	info	account_signup	New account created: vasendak	{"telegramUsername": "vasendak"}	35.243.247.101	2026-03-24 13:59:07.44+00
440	login	info	account_login	Account login: vasendak	{"telegramUsername": "vasendak"}	35.231.191.228	2026-03-24 14:01:20+00
441	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.139.18.212	2026-03-24 14:02:07.166+00
442	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-24 14:02:28.905+00
443	order	info	order_updated_by_admin	Admin updated order 0012 (@JBonwards): telegramUsername	{"code": "0012", "changes": {"telegramUsername": "JBonwards"}, "orderId": "f390e78f-35ca-4021-a236-a0c36532a061", "telegramUsername": "@JBonwards"}	35.227.80.228	2026-03-24 14:02:38.286+00
444	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	35.190.148.147	2026-03-24 14:03:01.163+00
445	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.139.18.212	2026-03-24 14:04:35.928+00
446	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	35.227.80.228	2026-03-24 14:05:09.247+00
447	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	35.243.247.101	2026-03-24 14:06:20.986+00
448	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	35.190.148.147	2026-03-24 14:07:30.396+00
449	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.148.7.61	2026-03-24 14:08:25.368+00
450	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.229.16.35	2026-03-24 14:08:55.958+00
451	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.148.7.61	2026-03-24 14:09:23.966+00
452	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.148.7.61	2026-03-24 14:09:30.682+00
453	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.229.16.35	2026-03-24 14:09:47.272+00
454	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	34.42.159.107	2026-03-24 14:12:03.345+00
455	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.227.80.228	2026-03-24 14:12:57.461+00
456	login	info	lookup_success	Successful order lookup for JBonwards (order 0012)	{"orderId": "f390e78f-35ca-4021-a236-a0c36532a061", "orderCode": "0012", "identifier": "0012", "telegramUsername": "JBonwards"}	35.190.148.147	2026-03-24 14:13:35.414+00
457	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.231.191.228	2026-03-24 14:14:49.466+00
458	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.227.80.228	2026-03-24 14:15:23.709+00
459	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.223.37.203	2026-03-24 14:16:25.71+00
460	login	warn	account_login_failed	Failed login attempt for: 0012	{"telegramUsername": "0012"}	35.229.16.35	2026-03-24 14:21:19.977+00
461	login	info	account_order_login	Order-based login for jbonwards using order 0012	{"orderCode": "0012", "needsPassword": true, "telegramUsername": "jbonwards"}	34.24.36.69	2026-03-24 14:23:42.059+00
463	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.23.146.22	2026-03-24 14:48:43.295+00
464	login	warn	account_login_failed	Failed login attempt for: pepboy43	{"telegramUsername": "pepboy43"}	34.23.146.22	2026-03-24 17:42:02.506+00
465	login	warn	account_login_failed	Failed login attempt for: atzz_mm	{"telegramUsername": "atzz_mm"}	34.24.36.69	2026-03-24 17:45:59.138+00
466	login	warn	account_login_failed	Failed login attempt for: atzz	{"telegramUsername": "atzz"}	35.231.191.228	2026-03-24 17:46:05.9+00
467	login	warn	account_login_failed	Failed login attempt for: atzz	{"telegramUsername": "atzz"}	35.231.191.228	2026-03-24 17:46:07.062+00
468	login	warn	account_login_failed	Failed login attempt for: atzz_mm	{"telegramUsername": "atzz_mm"}	35.227.80.228	2026-03-24 17:46:35.489+00
469	login	warn	account_login_failed	Failed login attempt for: atzz_mm	{"telegramUsername": "atzz_mm"}	34.24.36.69	2026-03-24 17:47:44.249+00
470	login	warn	account_login_failed	Failed login attempt for: atzz	{"telegramUsername": "atzz"}	34.139.18.212	2026-03-24 17:47:50.116+00
471	login	info	account_signup	New account created: atzz_mm	{"telegramUsername": "atzz_mm"}	34.75.203.62	2026-03-24 17:48:14.199+00
472	login	info	account_signup	New account created: simonayybee	{"telegramUsername": "simonayybee"}	34.75.203.62	2026-03-24 18:07:30.738+00
473	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.70.36.173	2026-03-24 19:28:06.981+00
474	login	warn	account_login_failed	Failed login attempt for: jbonwards	{"telegramUsername": "jbonwards"}	34.24.36.69	2026-03-24 19:28:24.799+00
475	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	34.24.36.69	2026-03-24 19:33:45.494+00
476	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	35.227.80.228	2026-03-24 19:33:56.743+00
477	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	35.231.191.228	2026-03-24 19:34:06.454+00
478	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	34.24.36.69	2026-03-24 19:34:26.445+00
479	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	34.139.18.212	2026-03-24 19:34:54.657+00
480	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	34.139.18.212	2026-03-24 19:35:00.637+00
481	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	35.227.80.228	2026-03-24 19:38:14.79+00
482	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	34.24.36.69	2026-03-24 19:38:41.383+00
483	login	warn	account_login_failed	Failed login attempt for: hagridv99	{"telegramUsername": "hagridv99"}	34.23.119.225	2026-03-24 19:38:46.017+00
484	login	warn	account_login_failed	Failed login attempt for: hagridv99	{"telegramUsername": "hagridv99"}	35.231.191.228	2026-03-24 19:38:51.313+00
485	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	35.231.191.228	2026-03-24 19:38:58.105+00
486	login	warn	account_login_failed	Failed login attempt for: hagridv99	{"telegramUsername": "hagridv99"}	34.23.119.225	2026-03-24 19:39:08.738+00
487	login	warn	account_login_failed	Failed login attempt for: hagridv99	{"telegramUsername": "hagridv99"}	34.24.36.69	2026-03-24 19:39:33.25+00
488	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	34.23.116.255	2026-03-24 19:40:07.145+00
489	login	warn	account_login_failed	Failed login attempt for: adev81	{"telegramUsername": "adev81"}	34.23.119.225	2026-03-24 19:43:12.776+00
490	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	34.139.18.212	2026-03-24 19:43:42.867+00
491	login	info	lookup_success	Successful order lookup for @HAGRIDV99 (order 0021)	{"orderId": "e8b38f59-85d4-4c03-9581-eca90f3bf35f", "orderCode": "0021", "identifier": "@hagridv99", "telegramUsername": "@HAGRIDV99"}	35.190.148.147	2026-03-24 19:46:14.373+00
492	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	34.139.18.212	2026-03-24 19:50:05.368+00
493	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	35.227.80.228	2026-03-24 19:50:18.121+00
494	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	34.23.119.225	2026-03-24 19:50:40.166+00
495	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	35.227.80.228	2026-03-24 19:52:08.268+00
496	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	35.227.80.228	2026-03-24 19:52:46.893+00
497	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	34.139.18.212	2026-03-24 19:53:10.504+00
498	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	34.23.119.225	2026-03-24 19:53:27.814+00
499	login	warn	lookup_failed	Failed order lookup for identifier: @rtac26	{"blocked": false, "identifier": "@rtac26", "failedAttempts": 1}	35.227.80.228	2026-03-24 19:56:03.79+00
500	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	35.227.80.228	2026-03-24 19:56:12.202+00
501	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	34.23.119.225	2026-03-24 19:57:00.245+00
502	login	warn	account_login_failed	Failed login attempt for: oc1313	{"telegramUsername": "oc1313"}	35.227.80.228	2026-03-24 19:57:16.595+00
503	login	warn	lookup_failed	Failed order lookup for identifier: @oc1313	{"blocked": false, "identifier": "@oc1313", "failedAttempts": 1}	35.227.80.228	2026-03-24 19:58:14.193+00
504	login	info	lookup_success	Successful order lookup for @OC1313 (order 0015)	{"orderId": "c675f7ec-5f9d-436a-afbd-fff7a1d4621a", "orderCode": "0015", "identifier": "@oc1313", "telegramUsername": "@OC1313"}	35.227.80.228	2026-03-24 19:58:34.669+00
505	login	info	lookup_success	Successful order lookup for @OC1313 (order 0015)	{"orderId": "c675f7ec-5f9d-436a-afbd-fff7a1d4621a", "orderCode": "0015", "identifier": "0015", "telegramUsername": "@OC1313"}	35.231.191.228	2026-03-24 19:59:57.478+00
506	login	warn	account_login_failed	Failed login attempt for: zii	{"telegramUsername": "zii"}	35.190.148.147	2026-03-24 20:24:26.808+00
556	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.23.116.255"}	34.23.116.255	2026-03-25 10:57:26.413+00
507	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "0036", "telegramUsername": "@Zii"}	35.190.148.147	2026-03-24 20:24:52.635+00
508	login	warn	account_login_failed	Failed login attempt for: slimsimma	{"telegramUsername": "slimsimma"}	34.75.203.62	2026-03-24 20:33:16.65+00
509	login	warn	account_login_failed	Failed login attempt for: slimsimma	{"telegramUsername": "slimsimma"}	34.23.119.225	2026-03-24 20:33:26.637+00
510	login	warn	account_login_failed	Failed login attempt for: slimsimma	{"telegramUsername": "slimsimma"}	35.229.16.35	2026-03-24 20:33:44.818+00
511	login	warn	account_login_failed	Failed login attempt for: slimsimma	{"telegramUsername": "slimsimma"}	35.231.191.228	2026-03-24 20:33:53.409+00
512	login	warn	account_login_failed	Failed login attempt for: slimsimma	{"telegramUsername": "slimsimma"}	35.229.16.35	2026-03-24 20:34:12.113+00
513	login	warn	account_login_failed	Failed login attempt for: panth89	{"telegramUsername": "panth89"}	35.190.148.147	2026-03-24 20:37:24.162+00
514	login	warn	account_login_failed	Failed login attempt for: panth89	{"telegramUsername": "panth89"}	35.243.247.101	2026-03-24 20:37:31.806+00
515	login	warn	account_login_failed	Failed login attempt for: panth89	{"telegramUsername": "panth89"}	34.73.164.200	2026-03-24 20:38:32.304+00
516	login	warn	account_login_failed	Failed login attempt for: panth89	{"telegramUsername": "panth89"}	34.73.164.200	2026-03-24 20:38:53.65+00
517	login	warn	account_login_failed	Failed login attempt for: panth89	{"telegramUsername": "panth89"}	34.73.164.200	2026-03-24 20:39:05.753+00
518	login	warn	account_login_failed	Failed login attempt for: sicoted	{"telegramUsername": "sicoted"}	34.73.164.200	2026-03-24 20:40:15.886+00
519	login	info	account_signup	New account created: sicoted	{"telegramUsername": "sicoted"}	35.190.148.147	2026-03-24 20:40:45.993+00
520	login	warn	account_login_failed	Failed login attempt for: k_andl	{"telegramUsername": "k_andl"}	35.229.16.35	2026-03-24 20:44:41.28+00
521	login	warn	account_login_failed	Failed login attempt for: k_andl	{"telegramUsername": "k_andl"}	34.23.116.255	2026-03-24 20:44:52.928+00
522	login	warn	account_login_failed	Failed login attempt for: k_andl	{"telegramUsername": "k_andl"}	35.229.16.35	2026-03-24 20:44:56.762+00
523	login	info	lookup_success	Successful order lookup for @Zii (order 0036)	{"orderId": "a434d697-4ad9-481d-8b13-74d343cd9590", "orderCode": "0036", "identifier": "0036", "telegramUsername": "@Zii"}	34.73.164.200	2026-03-24 21:00:22.433+00
524	login	warn	account_login_failed	Failed login attempt for: oj	{"telegramUsername": "oj"}	34.73.164.200	2026-03-24 21:05:55.441+00
525	login	warn	account_login_failed	Failed login attempt for: oj	{"telegramUsername": "oj"}	35.190.148.147	2026-03-24 21:06:26.94+00
526	login	warn	account_login_failed	Failed login attempt for: oj	{"telegramUsername": "oj"}	35.190.148.147	2026-03-24 21:06:33.965+00
527	login	warn	account_login_failed	Failed login attempt for: jph0402	{"telegramUsername": "jph0402"}	35.227.80.228	2026-03-24 21:16:20.752+00
528	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.73.164.200	2026-03-24 22:01:06.218+00
529	login	warn	account_login_failed	Failed login attempt for: avayamango	{"telegramUsername": "avayamango"}	136.111.227.54	2026-03-24 22:23:44.952+00
530	login	warn	account_login_failed	Failed login attempt for: avayamango	{"telegramUsername": "avayamango"}	35.223.37.203	2026-03-24 22:23:59.012+00
531	login	info	lookup_success	Successful order lookup for @NeverEvenSeenIt (order 0032)	{"orderId": "ed8e0967-57d6-421d-906e-8ca68e8cc3ba", "orderCode": "0032", "identifier": "@neverevenseenit", "telegramUsername": "@NeverEvenSeenIt"}	35.227.80.228	2026-03-24 23:19:28.988+00
532	login	warn	account_login_failed	Failed login attempt for: untamedchazy	{"telegramUsername": "untamedchazy"}	35.243.247.101	2026-03-25 04:35:24.698+00
533	login	warn	account_login_failed	Failed login attempt for: untamedchazy	{"telegramUsername": "untamedchazy"}	35.190.148.147	2026-03-25 04:35:30.736+00
534	login	info	account_order_login	Order-based login for untamedchazy using order 2248	{"orderCode": "2248", "needsPassword": true, "telegramUsername": "untamedchazy"}	34.75.27.139	2026-03-25 04:36:03.181+00
535	login	warn	lookup_failed	Failed order lookup for identifier: avayamango	{"blocked": false, "identifier": "avayamango", "failedAttempts": 1}	34.75.203.62	2026-03-25 07:00:22.667+00
536	login	warn	lookup_failed	Failed order lookup for identifier: 0000	{"blocked": false, "identifier": "0000", "failedAttempts": 1}	34.138.110.253	2026-03-25 07:00:35.033+00
537	login	warn	account_login_failed	Failed login attempt for: jack3797	{"telegramUsername": "jack3797"}	34.139.18.212	2026-03-25 07:27:59.322+00
538	login	info	account_signup	New account created: jack3797	{"telegramUsername": "jack3797"}	35.231.191.228	2026-03-25 07:28:22.327+00
539	login	info	account_order_login	Order-based login for jack3797 using order 0010	{"orderCode": "0010", "needsPassword": false, "telegramUsername": "jack3797"}	34.27.205.134	2026-03-25 07:29:00.459+00
540	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.55.6.210"}	34.55.6.210	2026-03-25 08:39:07.532+00
541	login	warn	account_login_failed	Failed login attempt for: hotlinerider	{"telegramUsername": "hotlinerider"}	35.190.148.147	2026-03-25 09:20:46.185+00
542	login	warn	account_login_failed	Failed login attempt for: hotlinerider	{"telegramUsername": "hotlinerider"}	35.190.148.147	2026-03-25 09:20:51.319+00
543	login	warn	account_login_failed	Failed login attempt for: hotlinerider	{"telegramUsername": "hotlinerider"}	34.75.27.139	2026-03-25 09:21:03.89+00
544	login	warn	account_login_failed	Failed login attempt for: hotlinerider	{"telegramUsername": "hotlinerider"}	35.190.148.147	2026-03-25 09:21:08.191+00
545	login	info	account_signup	New account created: hotlinerider	{"telegramUsername": "hotlinerider"}	35.190.148.147	2026-03-25 09:21:19.508+00
546	login	warn	account_login_failed	Failed login attempt for: scott	{"telegramUsername": "scott"}	34.23.116.255	2026-03-25 09:42:51.009+00
547	login	warn	account_login_failed	Failed login attempt for: scott	{"telegramUsername": "scott"}	34.23.116.255	2026-03-25 09:43:07.021+00
548	login	warn	account_login_failed	Failed login attempt for: scott	{"telegramUsername": "scott"}	104.196.175.96	2026-03-25 09:43:09.572+00
549	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-25 10:01:52.001+00
550	login	warn	account_login_failed	Failed login attempt for: nemo	{"telegramUsername": "nemo"}	35.190.148.147	2026-03-25 10:42:07.875+00
551	login	warn	account_login_failed	Failed login attempt for: nemo	{"telegramUsername": "nemo"}	34.75.27.139	2026-03-25 10:42:14.074+00
552	login	warn	account_login_failed	Failed login attempt for: nemo	{"telegramUsername": "nemo"}	35.243.247.101	2026-03-25 10:42:15.827+00
553	login	warn	account_login_failed	Failed login attempt for: nemo	{"telegramUsername": "nemo"}	35.243.247.101	2026-03-25 10:42:16.907+00
557	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	34.60.205.200	2026-03-25 10:57:35.25+00
558	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.138.110.253"}	34.138.110.253	2026-03-25 10:58:17.901+00
559	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.75.203.62	2026-03-25 11:00:12.576+00
560	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	34.23.119.225	2026-03-25 11:00:24.483+00
561	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	34.70.36.173	2026-03-25 11:01:31.173+00
562	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.10.2.232"}	34.10.2.232	2026-03-25 11:28:18.754+00
563	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-25 11:30:27.012+00
564	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-25 11:30:30.962+00
565	login	warn	lookup_failed	Failed order lookup for identifier: mand	{"blocked": false, "identifier": "mand", "failedAttempts": 1}	34.138.110.253	2026-03-25 11:30:44.572+00
566	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-25 11:30:49.743+00
567	login	warn	lookup_failed	Failed order lookup for identifier: mand	{"blocked": false, "identifier": "mand", "failedAttempts": 2}	34.75.203.62	2026-03-25 11:30:55.112+00
568	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-25 11:30:58.499+00
569	login	info	lookup_success	Successful order lookup for Mand (order 0022)	{"orderId": "af9e5b89-b039-4746-93be-5e2c9cf2dddd", "orderCode": "0022", "identifier": "0022", "telegramUsername": "Mand"}	104.196.175.96	2026-03-25 11:31:03.779+00
570	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-25 11:31:16.98+00
571	login	warn	lookup_failed	Failed order lookup for identifier: @jbonwards	{"blocked": false, "identifier": "@jbonwards", "failedAttempts": 1}	34.55.6.210	2026-03-25 11:58:05.749+00
572	login	warn	lookup_failed	Failed order lookup for identifier: jbonwards	{"blocked": false, "identifier": "jbonwards", "failedAttempts": 1}	34.60.205.200	2026-03-25 11:58:13.598+00
573	login	warn	lookup_failed	Failed order lookup for identifier: @jbonwards	{"blocked": false, "identifier": "@jbonwards", "failedAttempts": 2}	34.70.36.173	2026-03-25 11:58:29.937+00
574	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	35.231.191.228	2026-03-25 12:36:25.25+00
575	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "0035", "telegramUsername": "@hotlinerider"}	34.139.18.212	2026-03-25 12:48:40.79+00
576	order	info	order_created	New order 6056 created by @ironmanjamie (Royal Mail, total: 1087.50)	{"code": "6056", "orderId": "56b0fc96-fb0a-4894-90e6-b0155adc13b2", "grandTotal": "1087.50", "deliveryMethod": "Royal Mail", "telegramUsername": "@ironmanjamie"}	34.75.27.139	2026-03-25 14:56:25.705+00
577	login	info	lookup_success	Successful order lookup for @ironmanjamie (order 6056)	{"orderId": "56b0fc96-fb0a-4894-90e6-b0155adc13b2", "orderCode": "6056", "identifier": "ironmanjamie", "telegramUsername": "@ironmanjamie"}	34.139.18.212	2026-03-25 14:57:36.349+00
578	login	info	lookup_success	Successful order lookup for Leonidas (order 0042)	{"orderId": "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", "orderCode": "0042", "identifier": "0042", "telegramUsername": "Leonidas"}	34.75.203.62	2026-03-25 15:59:54.356+00
579	login	info	lookup_success	Successful order lookup for Leonidas (order 0042)	{"orderId": "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", "orderCode": "0042", "identifier": "0042", "telegramUsername": "Leonidas"}	104.196.175.96	2026-03-25 16:01:42.307+00
580	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.139.18.212	2026-03-25 21:01:13.71+00
581	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	35.232.198.130	2026-03-25 21:47:09.602+00
582	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.75.203.62	2026-03-25 22:03:27.105+00
583	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.139.18.212	2026-03-26 02:28:43.752+00
584	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.75.27.139	2026-03-26 02:30:30.495+00
585	login	info	lookup_success	Successful order lookup for @untamedchazy (order 2248)	{"orderId": "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", "orderCode": "2248", "identifier": "untamedchazy", "telegramUsername": "@untamedchazy"}	34.75.203.62	2026-03-26 04:41:27.256+00
586	login	warn	lookup_failed	Failed order lookup for identifier: scott	{"blocked": false, "identifier": "scott", "failedAttempts": 1}	35.231.191.228	2026-03-26 10:44:31.139+00
587	login	warn	lookup_failed	Failed order lookup for identifier: scott	{"blocked": false, "identifier": "scott", "failedAttempts": 2}	35.231.191.228	2026-03-26 10:44:43.776+00
588	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	35.231.191.228	2026-03-26 10:44:49.946+00
589	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	34.139.18.212	2026-03-26 10:45:44.71+00
590	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.138.110.253	2026-03-26 11:00:39.612+00
591	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	34.23.119.225	2026-03-26 12:01:20.595+00
592	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	34.139.18.212	2026-03-26 12:06:50.61+00
593	login	info	lookup_success	Successful order lookup for @Grundlefly1 (order 3169)	{"orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "orderCode": "3169", "identifier": "@grundlefly1", "telegramUsername": "@Grundlefly1"}	34.139.201.101	2026-03-26 13:54:42.117+00
594	order	warn	order_deleted_by_customer	Customer deleted order 3169 (@Grundlefly1, status: Submitted)	{"code": "3169", "status": "Submitted", "orderId": "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", "telegramUsername": "@Grundlefly1"}	34.75.203.62	2026-03-26 13:55:07.205+00
595	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	34.75.203.62	2026-03-26 19:15:08.745+00
596	login	info	admin_login_success	Admin logged in successfully	{"ip": "104.196.175.96"}	104.196.175.96	2026-03-26 21:13:04.176+00
597	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.75.168.125"}	34.75.168.125	2026-03-26 21:15:22.357+00
598	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	34.138.174.12	2026-03-26 21:20:06.032+00
599	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-26 21:20:50.169+00
600	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-26 21:20:52.962+00
601	login	info	admin_login_success	Admin logged in successfully	{"ip": "104.196.175.96"}	104.196.175.96	2026-03-26 21:27:39.208+00
602	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.75.27.139"}	34.75.27.139	2026-03-26 21:40:43.588+00
603	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.75.168.125"}	34.75.168.125	2026-03-26 21:46:01.53+00
604	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-26 21:48:33.984+00
605	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.231.191.228"}	35.231.191.228	2026-03-26 21:49:00.091+00
606	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-26 21:57:36.807+00
607	login	warn	lookup_failed	Failed order lookup for identifier: @jbonwards	{"blocked": false, "identifier": "@jbonwards", "failedAttempts": 3}	34.138.110.253	2026-03-27 06:50:50.678+00
608	login	warn	lookup_failed	Failed order lookup for identifier: jbonwards	{"blocked": false, "identifier": "jbonwards", "failedAttempts": 2}	34.139.201.101	2026-03-27 06:51:01.237+00
609	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	104.196.175.96	2026-03-27 07:03:26.219+00
610	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	34.75.27.139	2026-03-27 09:00:42.876+00
611	login	warn	lookup_failed	Failed order lookup for identifier: @carpediem831	{"blocked": false, "identifier": "@carpediem831", "failedAttempts": 1}	34.75.168.125	2026-03-27 09:17:57.626+00
612	login	info	lookup_success	Successful order lookup for @carpediem831 (order 7884)	{"orderId": "ef424a02-1925-4f55-949b-4b714f5c7cbc", "orderCode": "7884", "identifier": "@carpediem831", "telegramUsername": "@carpediem831"}	34.23.119.225	2026-03-27 09:18:06.786+00
613	login	info	lookup_success	Successful order lookup for @carpediem831 (order 7884)	{"orderId": "ef424a02-1925-4f55-949b-4b714f5c7cbc", "orderCode": "7884", "identifier": "@carpediem831", "telegramUsername": "@carpediem831"}	34.23.119.225	2026-03-27 09:32:25.126+00
614	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	34.139.18.212	2026-03-27 10:01:11.329+00
615	order	info	order_created	New order 8583 created by @mkp_uk (InPost, total: 123.00)	{"code": "8583", "orderId": "f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93", "grandTotal": "123.00", "deliveryMethod": "InPost", "telegramUsername": "@mkp_uk"}	34.23.119.225	2026-03-27 13:20:48.392+00
616	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 2}	34.55.6.210	2026-03-27 13:30:43.869+00
617	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 3}	34.75.203.62	2026-03-27 13:30:46.186+00
618	order	info	order_created	New order 9360 created by @ploddingalong (Royal Mail, total: 971.00)	{"code": "9360", "orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "grandTotal": "971.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@ploddingalong"}	34.138.110.253	2026-03-27 13:37:54.033+00
619	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.75.203.62	2026-03-27 13:38:11.889+00
620	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	34.139.18.212	2026-03-27 16:58:39.432+00
621	login	info	lookup_success	Successful order lookup for @carpediem831 (order 7884)	{"orderId": "ef424a02-1925-4f55-949b-4b714f5c7cbc", "orderCode": "7884", "identifier": "@carpediem831", "telegramUsername": "@carpediem831"}	34.138.174.12	2026-03-27 18:46:17.063+00
622	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.138.174.12	2026-03-27 21:42:50.217+00
623	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.75.27.139	2026-03-27 21:54:55.932+00
624	login	warn	lookup_failed	Failed order lookup for identifier: @sublantis	{"blocked": false, "identifier": "@sublantis", "failedAttempts": 1}	34.139.201.101	2026-03-28 06:10:40.421+00
625	login	warn	lookup_failed	Failed order lookup for identifier: sublantis	{"blocked": false, "identifier": "sublantis", "failedAttempts": 1}	34.138.110.253	2026-03-28 06:10:53.7+00
626	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.75.27.139	2026-03-28 09:22:55.79+00
627	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	104.196.175.96	2026-03-28 09:26:22.093+00
628	login	info	lookup_success	Successful order lookup for @HAGRIDV99 (order 0021)	{"orderId": "e8b38f59-85d4-4c03-9581-eca90f3bf35f", "orderCode": "0021", "identifier": "@hagridv99", "telegramUsername": "@HAGRIDV99"}	34.75.27.139	2026-03-28 10:46:43.579+00
629	login	info	lookup_success	Successful order lookup for @HAGRIDV99 (order 0021)	{"orderId": "e8b38f59-85d4-4c03-9581-eca90f3bf35f", "orderCode": "0021", "identifier": "@hagridv99", "telegramUsername": "@HAGRIDV99"}	34.138.174.12	2026-03-28 10:47:33.719+00
630	order	warn	order_deleted_by_customer	Customer deleted order 0021 (@HAGRIDV99, status: Submitted)	{"code": "0021", "status": "Submitted", "orderId": "e8b38f59-85d4-4c03-9581-eca90f3bf35f", "telegramUsername": "@HAGRIDV99"}	34.138.174.12	2026-03-28 10:47:37.595+00
631	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.23.119.225	2026-03-28 19:24:43.113+00
632	login	info	lookup_success	Successful order lookup for @carpediem831 (order 7884)	{"orderId": "ef424a02-1925-4f55-949b-4b714f5c7cbc", "orderCode": "7884", "identifier": "carpediem831", "telegramUsername": "@carpediem831"}	104.196.175.96	2026-03-28 19:55:53.553+00
633	login	info	lookup_success	Successful order lookup for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "identifier": "andyt2888", "telegramUsername": "@andyt2888"}	35.231.191.228	2026-03-28 22:07:18.752+00
634	login	info	lookup_success	Successful order lookup for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "identifier": "andyt2888", "telegramUsername": "@andyt2888"}	35.231.191.228	2026-03-28 22:09:44.89+00
635	login	info	lookup_success	Successful order lookup for @andyt2888 (order 6730)	{"orderId": "6005ce00-0b76-4cc5-80ee-3597213a8c66", "orderCode": "6730", "identifier": "andyt2888", "telegramUsername": "@andyt2888"}	34.75.203.62	2026-03-28 22:23:30.582+00
636	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.27.205.134	2026-03-29 07:17:22.066+00
637	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.75.203.62	2026-03-29 07:30:12.797+00
638	login	info	lookup_success	Successful order lookup for @untamedchazy (order 2248)	{"orderId": "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", "orderCode": "2248", "identifier": "untamedchazy", "telegramUsername": "@untamedchazy"}	34.138.174.12	2026-03-29 08:39:29.776+00
639	login	info	lookup_success	Successful order lookup for clarke (order 0043)	{"orderId": "ece1625b-f1c1-48fc-827c-9a5978560ac7", "orderCode": "0043", "identifier": "0043", "telegramUsername": "clarke"}	34.75.27.139	2026-03-29 09:12:20.179+00
640	login	warn	lookup_failed	Failed order lookup for identifier: @grundlefly1	{"blocked": false, "identifier": "@grundlefly1", "failedAttempts": 1}	34.75.27.139	2026-03-29 10:33:28.304+00
641	order	info	order_created	New order 5168 created by @grundlefly1 (InPost, total: 303.00)	{"code": "5168", "orderId": "4e4a3e91-871e-4486-8b8e-828a75cd40f1", "grandTotal": "303.00", "deliveryMethod": "InPost", "telegramUsername": "@grundlefly1"}	34.138.174.12	2026-03-29 10:36:06.739+00
642	login	info	lookup_success	Successful order lookup for @grundlefly1 (order 5168)	{"orderId": "4e4a3e91-871e-4486-8b8e-828a75cd40f1", "orderCode": "5168", "identifier": "@grundlefly1", "telegramUsername": "@grundlefly1"}	35.231.191.228	2026-03-29 10:36:45.815+00
643	login	info	lookup_success	Successful order lookup for @ADev81 (order 0024)	{"orderId": "7522e0b8-cf16-40ef-aff9-9b3180098433", "orderCode": "0024", "identifier": "adev81", "telegramUsername": "@ADev81"}	35.231.191.228	2026-03-29 11:46:06.651+00
644	login	info	lookup_success	Successful order lookup for @grundlefly1 (order 5168)	{"orderId": "4e4a3e91-871e-4486-8b8e-828a75cd40f1", "orderCode": "5168", "identifier": "@grundlefly1", "telegramUsername": "@grundlefly1"}	34.139.201.101	2026-03-29 13:30:33.14+00
645	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	34.70.36.173	2026-03-29 15:14:24.958+00
646	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.170.8.0	2026-03-29 16:39:59.8+00
647	login	info	lookup_success	Successful order lookup for @grundlefly1 (order 5168)	{"orderId": "4e4a3e91-871e-4486-8b8e-828a75cd40f1", "orderCode": "5168", "identifier": "@grundlefly1", "telegramUsername": "@grundlefly1"}	35.231.191.228	2026-03-29 20:02:18.428+00
648	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.139.18.212	2026-03-29 20:30:26.075+00
649	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	104.196.175.96	2026-03-29 20:31:39.425+00
650	login	warn	lookup_failed	Failed order lookup for identifier: fbx2000	{"blocked": false, "identifier": "fbx2000", "failedAttempts": 4}	34.46.236.1	2026-03-29 20:37:57.654+00
651	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	34.75.203.62	2026-03-30 02:46:43.497+00
652	login	info	lookup_success	Successful order lookup for @scott (order 5237)	{"orderId": "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", "orderCode": "5237", "identifier": "scott", "telegramUsername": "@scott"}	34.138.110.253	2026-03-30 09:42:05.67+00
653	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-30 10:38:15.688+00
654	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.139.18.212"}	34.139.18.212	2026-03-30 10:38:47.002+00
655	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.138.110.253"}	34.138.110.253	2026-03-30 10:40:04.205+00
737	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:24:06.032446+00
656	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	35.231.191.228	2026-03-30 11:49:45.858+00
657	login	info	lookup_success	Successful order lookup for @S S C (order 0027)	{"orderId": "03a194ac-176f-45d5-9f81-6a28e7f17c0c", "orderCode": "0027", "identifier": "@s s c", "telegramUsername": "@S S C"}	34.75.168.125	2026-03-30 15:45:24.571+00
658	login	info	lookup_success	Successful order lookup for @kenupfront (order 0016)	{"orderId": "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", "orderCode": "0016", "identifier": "@kenupfront", "telegramUsername": "@kenupfront"}	34.138.110.253	2026-03-30 16:16:44.693+00
659	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.139.201.101	2026-03-30 17:42:14.091+00
660	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.138.174.12	2026-03-30 17:58:43.664+00
661	login	info	lookup_success	Successful order lookup for @panth89 (order 1850)	{"orderId": "f7ad2e8d-85c8-40f5-b209-089b571acdad", "orderCode": "1850", "identifier": "@panth89", "telegramUsername": "@panth89"}	136.114.114.40	2026-03-30 19:36:04.066+00
662	login	info	lookup_success	Successful order lookup for @ploddingalong (order 9360)	{"orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "orderCode": "9360", "identifier": "@ploddingalong", "telegramUsername": "@ploddingalong"}	34.139.201.101	2026-03-31 18:33:34.883+00
663	order	warn	order_deleted_by_customer	Customer deleted order 9360 (@ploddingalong, status: Submitted)	{"code": "9360", "status": "Submitted", "orderId": "d6cb9628-82e3-42e1-a9b0-7dc044c79837", "telegramUsername": "@ploddingalong"}	34.139.201.101	2026-03-31 18:33:40.59+00
664	login	warn	lookup_failed	Failed order lookup for identifier: @ploddingalong	{"blocked": false, "identifier": "@ploddingalong", "failedAttempts": 1}	34.138.110.253	2026-03-31 18:33:44.484+00
665	login	info	admin_login_success	Admin logged in successfully	{"ip": "104.196.175.96"}	104.196.175.96	2026-03-31 20:12:10.479+00
666	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.139.18.212	2026-04-01 01:09:12.532+00
667	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.139.18.212	2026-04-01 01:10:18.456+00
668	login	info	lookup_success	Successful order lookup for @1poundfish (order 6399)	{"orderId": "bd3ef131-5462-4867-b158-096b0ab8ccf3", "orderCode": "6399", "identifier": "1poundfish", "telegramUsername": "@1poundfish"}	34.26.8.8	2026-04-01 10:36:07.093+00
669	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.26.8.8	2026-04-01 11:36:32.409+00
670	login	warn	lookup_failed	Failed order lookup for identifier: j_p_b8_2	{"blocked": false, "identifier": "j_p_b8_2", "failedAttempts": 1}	34.75.27.139	2026-04-01 13:01:48.887+00
671	login	info	lookup_success	Successful order lookup for @j_p_b8_2 (order 9904)	{"orderId": "2b5c150d-a993-40be-9e5a-8c284157a010", "orderCode": "9904", "identifier": "j_p_b8_2", "telegramUsername": "@j_p_b8_2"}	34.75.27.139	2026-04-01 13:02:05.254+00
672	login	info	lookup_success	Successful order lookup for @j_p_b8_2 (order 9904)	{"orderId": "2b5c150d-a993-40be-9e5a-8c284157a010", "orderCode": "9904", "identifier": "j_p_b8_2", "telegramUsername": "@j_p_b8_2"}	34.75.27.139	2026-04-01 13:28:32.329+00
673	login	info	lookup_success	Successful order lookup for @josie_uk (order 0030)	{"orderId": "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", "orderCode": "0030", "identifier": "@josie_uk", "telegramUsername": "@josie_uk"}	34.26.52.113	2026-04-01 13:47:29.606+00
674	login	info	lookup_success	Successful order lookup for @kenupfront (order 0016)	{"orderId": "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", "orderCode": "0016", "identifier": "@kenupfront", "telegramUsername": "@kenupfront"}	34.23.119.225	2026-04-01 14:13:29.311+00
675	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	34.75.168.125	2026-04-01 14:19:11.838+00
676	login	info	lookup_success	Successful order lookup for @hotlinerider (order 0035)	{"orderId": "05edc6e3-04b1-4487-bdda-898348202bfb", "orderCode": "0035", "identifier": "hotlinerider", "telegramUsername": "@hotlinerider"}	34.75.27.139	2026-04-01 16:18:22.202+00
677	login	info	admin_login_success	Admin logged in successfully	{"ip": "104.196.175.96"}	104.196.175.96	2026-04-01 17:33:02.354+00
678	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.26.52.113	2026-04-01 17:56:02.735+00
679	login	info	lookup_success	Successful order lookup for @Nemo (order 0031)	{"orderId": "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", "orderCode": "0031", "identifier": "nemo", "telegramUsername": "@Nemo"}	34.26.88.169	2026-04-01 19:09:52.697+00
680	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	104.196.57.135	2026-04-02 03:28:21.926+00
681	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.23.58.192	2026-04-02 05:35:46.619+00
682	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.26.88.169	2026-04-02 05:45:42.01+00
683	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	34.139.18.212	2026-04-02 09:16:01.859+00
684	login	info	lookup_success	Successful order lookup for @grundlefly1 (order 5168)	{"orderId": "4e4a3e91-871e-4486-8b8e-828a75cd40f1", "orderCode": "5168", "identifier": "@grundlefly1", "telegramUsername": "@grundlefly1"}	34.26.88.169	2026-04-02 14:59:26.609+00
685	login	info	lookup_success	Successful order lookup for @Jayjo8 (order 0034)	{"orderId": "83a3d960-ba23-47a3-883c-ed6883ab9d27", "orderCode": "0034", "identifier": "0034", "telegramUsername": "@Jayjo8"}	104.196.57.135	2026-04-02 16:30:47.163+00
686	login	info	lookup_success	Successful order lookup for @Jayjo8 (order 0034)	{"orderId": "83a3d960-ba23-47a3-883c-ed6883ab9d27", "orderCode": "0034", "identifier": "0034", "telegramUsername": "@Jayjo8"}	34.23.58.192	2026-04-02 16:42:29.6+00
687	login	info	lookup_success	Successful order lookup for @Jayjo8 (order 0034)	{"orderId": "83a3d960-ba23-47a3-883c-ed6883ab9d27", "orderCode": "0034", "identifier": "jayjo8", "telegramUsername": "@Jayjo8"}	35.196.29.110	2026-04-02 16:47:38.248+00
688	login	info	lookup_success	Successful order lookup for @Jack3797 (order 0010)	{"orderId": "fff847e8-871c-423b-86c5-eddea6dfe217", "orderCode": "0010", "identifier": "jack3797", "telegramUsername": "@Jack3797"}	34.138.110.253	2026-04-02 18:56:25.564+00
689	login	info	lookup_success	Successful order lookup for @vasendak (order 0039)	{"orderId": "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", "orderCode": "0039", "identifier": "vasendak", "telegramUsername": "@vasendak"}	104.196.57.135	2026-04-02 19:00:56.641+00
690	login	info	lookup_success	Successful order lookup for @zebble76 (order 0013)	{"orderId": "1b975899-08c0-439c-b0bb-b65f0092d0aa", "orderCode": "0013", "identifier": "0013", "telegramUsername": "@zebble76"}	34.26.52.113	2026-04-02 19:59:03.209+00
691	login	info	lookup_success	Successful order lookup for @Jayjo8 (order 0034)	{"orderId": "83a3d960-ba23-47a3-883c-ed6883ab9d27", "orderCode": "0034", "identifier": "jayjo8", "telegramUsername": "@Jayjo8"}	34.138.110.253	2026-04-03 09:13:25.737+00
692	login	warn	account_login_failed	Failed smart-login for: iam0121	{"telegramUsername": "iam0121"}	127.0.0.1	2026-04-05 14:07:59.701+00
693	login	info	account_signup	New account created: iam0121	{"telegramUsername": "iam0121"}	127.0.0.1	2026-04-05 14:08:11.329+00
694	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-05 14:08:36.796+00
695	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-05 22:14:19.236+00
696	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "::1"}	::1	2026-04-06 07:55:52.205+00
697	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 07:57:54.148+00
698	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 07:57:54.27+00
699	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 07:59:18.159+00
700	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 07:59:50.317+00
701	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 07:59:50.485+00
702	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:05:54.124+00
703	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:05:54.453+00
704	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:06:36.892+00
705	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:06:37.274+00
706	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:06:53.417+00
707	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:06:53.493+00
708	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:16:54.147+00
709	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:16:59.786+00
710	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:19:18.785+00
711	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:25:01.991+00
712	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:25:29.912+00
713	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:25:31.69+00
714	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:25:38.893+00
715	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 08:25:42.317+00
716	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-06 09:11:07.861+00
717	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-10 09:09:03.243004+00
718	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 11:18:00.02404+00
719	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 11:18:00.204732+00
720	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 11:32:49.998922+00
721	order	info	order_created	New order 7064 created by @test (InPost, total: 168.00)	{"code": "7064", "orderId": "2cea936c-6a34-46ca-8903-939aa73fbf76", "grandTotal": "168.00", "deliveryMethod": "InPost", "telegramUsername": "@test"}	127.0.0.1	2026-04-10 11:39:37.839278+00
722	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 15:57:55.971845+00
723	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 16:20:44.88505+00
724	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 16:31:33.016211+00
725	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 16:33:28.375767+00
726	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 16:34:49.258897+00
727	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 16:38:30.442015+00
728	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 16:43:10.512469+00
729	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:04:38.11901+00
730	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:07:11.334162+00
731	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:13:39.630622+00
732	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:15:30.564033+00
733	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:17:11.268855+00
734	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:18:43.471651+00
735	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:20:19.055196+00
736	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:21:44.146975+00
738	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:28:19.115183+00
739	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:30:03.203929+00
740	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:30:06.133937+00
741	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:30:07.640888+00
742	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:30:07.780864+00
743	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:30:23.239571+00
744	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:38:24.173656+00
745	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:39:59.134259+00
746	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:42:42.350912+00
747	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:45:29.816056+00
748	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:45:31.353936+00
749	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:45:31.483169+00
750	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:46:30.77069+00
751	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:47:37.997108+00
752	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:48:43.820142+00
753	order	info	order_created	New order 6110 created by @testing (Royal Mail, total: 90.00)	{"code": "6110", "orderId": "a6ba6cbb-4a5d-4674-b422-4b45e96481a1", "grandTotal": "90.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@testing"}	127.0.0.1	2026-04-10 17:51:34.715806+00
754	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:52:21.706485+00
755	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:56:16.610616+00
756	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:57:50.788832+00
757	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 17:57:52.094516+00
758	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:04:21.170717+00
759	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:04:28.767033+00
760	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:05:46.55114+00
761	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:11:44.17431+00
762	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:11:45.562108+00
763	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:13:31.343177+00
764	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:13:32.703155+00
765	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:22:38.731+00
766	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:28:35.649133+00
767	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:28:40.602041+00
768	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:51:19.474679+00
769	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:53:07.08937+00
770	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 18:53:22.275577+00
771	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 19:00:07.383612+00
772	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 19:18:50.755831+00
773	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 19:29:00.816187+00
774	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 19:48:41.850916+00
775	order	info	order_created	New order 6633 created by @iam0121 (Royal Mail, total: 90.00)	{"code": "6633", "orderId": "8e2d911c-ddbd-4f96-b25c-620288e64291", "grandTotal": "90.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@iam0121"}	127.0.0.1	2026-04-10 19:54:30.409516+00
776	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:02:47.214049+00
777	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:16:32.381054+00
778	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:21:47.809484+00
779	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:28:02.975205+00
780	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:30:33.95411+00
781	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:31:35.848288+00
782	order	info	order_updated_by_admin	Order 6633 (@iam0121): Payment: "unpaid" → "confirmed"	{"code": "6633", "after": {"paymentStatus": "confirmed"}, "before": {"paymentStatus": "unpaid"}, "orderId": "8e2d911c-ddbd-4f96-b25c-620288e64291", "telegramUsername": "@iam0121"}	127.0.0.1	2026-04-10 20:31:52.497912+00
783	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 20:54:27.753418+00
784	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 21:09:13.1904+00
785	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 21:25:17.807318+00
786	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-10 21:49:02.792894+00
787	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 23:25:59.658623+00
788	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 23:25:59.806516+00
789	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 23:26:48.667103+00
790	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 23:48:43.224607+00
791	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-10 23:57:49.298691+00
792	order	info	shipping_address_updated	Customer set shipping address on order 6633 (@iam0121) via portal	{"code": "6633", "orderId": "8e2d911c-ddbd-4f96-b25c-620288e64291", "telegramUsername": "@iam0121"}	127.0.0.1	2026-04-11 00:07:28.478968+00
793	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 00:07:52.895452+00
794	order	info	order_updated_by_admin	Order 6633 (@iam0121): Status: "Submitted" → "Shipped"	{"code": "6633", "after": {"status": "Shipped"}, "before": {"status": "Submitted"}, "orderId": "8e2d911c-ddbd-4f96-b25c-620288e64291", "telegramUsername": "@iam0121"}	127.0.0.1	2026-04-11 00:08:40.273677+00
795	login	warn	account_login_failed	Failed smart-login for: iam0121	{"telegramUsername": "iam0121"}	127.0.0.1	2026-04-11 08:05:05.022619+00
796	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-11 08:05:12.962315+00
797	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 08:06:32.61504+00
798	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 08:10:24.201052+00
799	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 08:15:44.501944+00
800	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 09:39:52.993622+00
801	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 09:42:44.615519+00
802	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 09:44:14.279524+00
803	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 09:45:38.328151+00
804	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 09:46:59.502532+00
805	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:04:00.647777+00
806	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:06:53.592171+00
807	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:13:37.11684+00
808	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:26:33.854038+00
809	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:31:09.98255+00
810	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:33:43.253434+00
811	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:36:25.250284+00
812	login	info	account_signup	New account created: sleepingpep	{"telegramUsername": "sleepingpep"}	127.0.0.1	2026-04-11 10:47:37.327937+00
813	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:53:11.843406+00
814	order	info	order_created	New order 8791 created by @sleepingpep (Royal Mail, total: 355.00)	{"code": "8791", "orderId": "ffece4fb-67d7-443a-8a9d-48340b0d640c", "grandTotal": "355.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@sleepingpep"}	127.0.0.1	2026-04-11 10:54:51.12501+00
815	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 10:55:04.696663+00
816	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:07:20.950018+00
817	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-11 11:10:32.459021+00
818	login	info	account_login	Account login (password): sleepingpep	{"loginMethod": "password", "telegramUsername": "sleepingpep"}	127.0.0.1	2026-04-11 11:10:45.411606+00
819	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:13:45.883318+00
820	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:14:24.853988+00
821	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:20:49.086359+00
822	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:32:13.517229+00
823	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:33:52.592943+00
824	order	info	order_created	New order 7164 created by @sleepingpep (Royal Mail, total: 355.00)	{"code": "7164", "orderId": "69c2436a-82e4-4306-ad13-bf8e8678698f", "grandTotal": "355.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@sleepingpep"}	127.0.0.1	2026-04-11 11:35:46.801946+00
825	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:36:13.805254+00
826	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:47:29.896734+00
827	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:51:53.548175+00
828	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:53:53.482577+00
829	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:54:22.070979+00
830	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 11:54:22.182366+00
831	seller	info	seller_login	Seller "Van" logged in	{"vendorId": "aa0c2358-d0e8-4e02-9297-887c90283b54", "vendorName": "Van"}	127.0.0.1	2026-04-11 11:54:29.763298+00
832	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 12:03:38.110781+00
833	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 12:03:45.17636+00
834	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-11 12:40:40.880084+00
835	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 16:24:52.787445+00
836	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 22:25:29.828247+00
837	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 22:25:29.963217+00
847	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 05:38:40.717801+00
866	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-12 07:37:08.300471+00
868	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:06:40.182797+00
869	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:06:40.314469+00
838	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 22:36:13.174059+00
848	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:16:59.347808+00
867	login	info	account_signup	New account created: testing1	{"telegramUsername": "testing1"}	127.0.0.1	2026-04-12 07:40:45.027108+00
870	order	info	order_created	New order 4958 created by @testing1 (Royal Mail, total: 175.00)	{"code": "4958", "orderId": "dbcc120d-0908-42b9-b772-68c2a70246b1", "grandTotal": "175.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@testing1"}	127.0.0.1	2026-04-12 09:08:10.107494+00
839	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 22:55:57.622352+00
840	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 22:56:02.967191+00
849	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:18:43.738801+00
871	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:09:22.258536+00
841	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 23:07:10.010615+00
850	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:19:58.167137+00
872	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:13:26.627273+00
842	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 23:10:47.408812+00
851	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:23:39.501654+00
873	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:14:02.087418+00
874	order	warn	order_deleted_by_customer	Customer deleted order 4958 (@testing1, status: Submitted) via portal	{"code": "4958", "status": "Submitted", "orderId": "dbcc120d-0908-42b9-b772-68c2a70246b1", "snapshot": {"lineItems": [{"quantity": "1.00", "productName": "Glutathione 1500mg GMP 20ml 10vials"}, {"quantity": "1.00", "productName": "5-Amino-1MQ 50mg"}], "grandTotal": "175.00", "deliveryMethod": "Royal Mail"}, "telegramUsername": "@testing1"}	127.0.0.1	2026-04-12 09:14:10.508415+00
843	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 23:18:13.361355+00
852	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:27:09.443125+00
875	order	info	order_created	New order 2846 created by @testing1 (Royal Mail, total: 70.00)	{"code": "2846", "orderId": "75892d30-9506-4ea1-ab7d-8cc89107364f", "grandTotal": "70.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@testing1"}	127.0.0.1	2026-04-12 09:14:44.301518+00
844	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-11 23:20:56.585383+00
853	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:33:15.162885+00
876	order	warn	order_deleted_by_customer	Customer deleted order 2846 (@testing1, status: Submitted) via portal	{"code": "2846", "status": "Submitted", "orderId": "75892d30-9506-4ea1-ab7d-8cc89107364f", "snapshot": {"lineItems": [{"quantity": "1.00", "productName": "5-Amino-1MQ 10mg"}], "grandTotal": "70.00", "deliveryMethod": "Royal Mail"}, "telegramUsername": "@testing1"}	127.0.0.1	2026-04-12 09:15:56.246193+00
845	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 23:27:33.108456+00
846	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-11 23:27:37.972639+00
854	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:34:45.973516+00
877	order	info	order_created	New order 7286 created by @testing1 (Royal Mail, total: 75.00)	{"code": "7286", "orderId": "7c8bddfd-8987-4ecf-a7be-0b60c92d42c4", "grandTotal": "75.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@testing1"}	127.0.0.1	2026-04-12 09:16:07.904213+00
855	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:36:02.806216+00
878	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:16:56.221823+00
856	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:40:27.66178+00
879	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:17:19.270994+00
857	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:41:53.537819+00
880	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 09:19:14.084826+00
858	order	info	order_created	New order 6427 created by @iam0121 (Royal Mail, total: 95.00)	{"code": "6427", "orderId": "e620d4f8-f1d3-435e-adc8-1d58e91f6109", "grandTotal": "95.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@iam0121"}	127.0.0.1	2026-04-12 06:46:59.244465+00
859	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:47:27.153024+00
860	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 06:54:12.274589+00
861	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 07:01:39.487664+00
862	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 07:01:52.560318+00
863	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 07:12:08.358917+00
864	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 07:14:51.450762+00
865	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 07:28:35.371413+00
881	login	info	account_login	Account login (password): iam0121	{"loginMethod": "password", "telegramUsername": "iam0121"}	127.0.0.1	2026-04-12 16:27:05.653519+00
882	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:30:12.47094+00
883	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:30:17.203362+00
884	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:32:54.831951+00
885	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:32:54.970841+00
886	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:33:07.456911+00
887	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:40:53.395504+00
888	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:40:53.524596+00
890	login	warn	admin_login_failed	Failed admin login attempt	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:46:41.662361+00
891	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:46:46.582999+00
892	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:46:46.723032+00
893	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 16:55:00.104275+00
894	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 17:15:25.497932+00
895	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 17:38:17.044156+00
896	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 17:38:17.190648+00
897	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 17:44:33.899844+00
898	login	info	admin_login_success	Admin logged in successfully	{"ip": "127.0.0.1"}	127.0.0.1	2026-04-12 17:44:34.033985+00
899	login	info	account_signup	New account created: penman123	{"telegramUsername": "penman123"}	35.233.10.2	2026-04-12 20:59:48.713552+00
901	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.14.41.126"}	34.14.41.126	2026-04-12 21:01:44.746412+00
900	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.233.10.2"}	35.233.10.2	2026-04-12 21:01:44.746564+00
902	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.38.35.146"}	34.38.35.146	2026-04-12 21:09:38.080042+00
903	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.38.221.16"}	34.38.221.16	2026-04-12 21:12:31.837618+00
904	order	info	order_created	New order 3341 created by @penman123 (Royal Mail, total: 105.00)	{"code": "3341", "orderId": "e534aa02-2195-4922-8bda-08cdbe653ff6", "grandTotal": "105.00", "deliveryMethod": "Royal Mail", "telegramUsername": "@penman123"}	34.140.137.65	2026-04-12 21:19:10.009581+00
905	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.14.41.126"}	34.14.41.126	2026-04-12 21:23:19.713569+00
906	login	info	admin_login_success	Admin logged in successfully	{"ip": "35.233.10.2"}	35.233.10.2	2026-04-12 21:32:20.028227+00
907	login	info	admin_login_success	Admin logged in successfully	{"ip": "34.38.221.16"}	34.38.221.16	2026-04-12 21:48:53.406928+00
\.


--
-- Data for Name: blood_test_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blood_test_sessions (id, telegram_username, test_date, lab_name, notes, created_at, test_name, measurement_type, medication_notes) FROM stdin;
1d5b5be7-3881-41c5-a6dd-0ee135f786bd	iam0121	2026-04-05	nhs	\N	2026-04-05 21:59:22.428+00	\N	\N	\N
29d4607b-365b-469f-a149-3ab172834ba7	iam0121	2026-02-04	\N	\N	2026-04-05 22:05:12.011+00	\N	\N	\N
f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	iam0121	2026-04-06	\N	\N	2026-04-06 20:48:04.432+00	Randox	Trough	\N
5517f816-fdd7-450c-8803-3332f61000e4	penman123	2026-04-03	\N	\N	2026-04-12 21:34:42.535564+00	blood test voy	Trough	\N
\.


--
-- Data for Name: blood_test_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blood_test_values (id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high) FROM stdin;
01e521fe-5ab3-489c-b9c4-3fcff8da1938	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	TSH	Thyroid	2.4100	mIU/L	0.2700	4.2000
020b9697-e50e-4a56-8a70-0e1b51a56b07	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Prolactin	Hormones	375.0000	mIU/L	86.0000	324.0000
041dca3e-2790-4727-a724-28741725bbf8	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Neutrophils	Full Blood Count	2.5700	×10⁹/L	1.8000	7.5000
0d38e911-2861-4ba5-aab1-7e20e20e9518	29d4607b-365b-469f-a149-3ab172834ba7	GGT	Liver	29.0000	U/L	\N	60.0000
12323e2c-0701-4fcf-a004-68202ceccdc3	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Urea	Kidney	5.8100	mmol/L	2.5000	7.8000
1e60694d-361e-4eba-bacc-458c28a7ebbb	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	HDL	Cholesterol	1.3700	mmol/L	1.0000	\N
26079425-8d18-44ba-b85d-c0dfe5922fe8	29d4607b-365b-469f-a149-3ab172834ba7	Free Testosterone	Hormones	0.4300	pmol/L	170.0000	670.0000
26bf17c9-fece-4b02-96fa-c498fd28a7b7	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Prolactin	Hormones	223.0000	mIU/L	\N	360.0000
2c417292-a482-441b-bc29-6bb87c1b606f	29d4607b-365b-469f-a149-3ab172834ba7	eGFR	Kidney	74.0000	mL/min/1.73m²	60.0000	\N
2f0c2e23-470b-45f8-b07e-c1f8703cc257	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Free Testosterone	Hormones	0.9530	pmol/L	170.0000	670.0000
2fbd4412-78ba-4332-b391-e059738cfd1a	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Free Testosterone	Hormones	0.2000	nmol/L	0.2260	0.6500
30996cda-2c26-4e89-8dc7-548947fef88f	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	SHBG	Hormones	61.3000	nmol/L	18.3000	54.1000
35e18f3b-7fde-4565-b108-0b25158f4593	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Oestradiol	Hormones	91.8000	pmol/L	41.0000	159.0000
3cda602b-6436-448e-a57c-38a178f43cf7	29d4607b-365b-469f-a149-3ab172834ba7	Free T4	Thyroid	21.0000	pmol/L	12.0000	22.0000
4197bae4-cc5b-4784-840f-dbd488e48e2a	29d4607b-365b-469f-a149-3ab172834ba7	Urea	Kidney	6.9800	mmol/L	2.5000	7.8000
428e9036-f23c-432f-9f9c-7c2d48e61cbd	29d4607b-365b-469f-a149-3ab172834ba7	LDL	Cholesterol	3.4900	mmol/L	\N	3.0000
44418468-8dda-4562-a2d0-944c99ee7830	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Lymphocytes	Full Blood Count	1.4800	×10⁹/L	1.0000	4.8000
46cd1f08-064d-4ff4-9ce8-ae7a5ecae7fb	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	ALP	Liver	42.0000	U/L	30.0000	130.0000
4fe67a3e-3852-4da3-b770-2e39aa8d4c91	29d4607b-365b-469f-a149-3ab172834ba7	Ferritin	Metabolic	175.9100	μg/L	30.0000	400.0000
52e806b5-4040-43fb-8048-a77832adb4f2	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	ALT	Liver	34.4000	U/L	\N	41.0000
584df235-155b-4256-80a6-e4d726022d4d	29d4607b-365b-469f-a149-3ab172834ba7	HbA1c	Metabolic	25.4600	mmol/mol	\N	48.0000
5a493d11-aa94-4117-8fb8-065d072f1054	29d4607b-365b-469f-a149-3ab172834ba7	Haematocrit	Full Blood Count	45.8000	L/L	0.4000	0.5200
6088b61a-db7f-49c2-aa28-1ac4171808f0	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Bilirubin	Liver	9.6100	μmol/L	\N	21.0000
61cb133e-469f-4374-841b-d0dab0b6ce43	29d4607b-365b-469f-a149-3ab172834ba7	ALT	Liver	19.0000	U/L	\N	41.0000
6b01681e-edfc-4d5c-899d-2372fc4f0edb	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Creatinine	Kidney	116.2000	μmol/L	64.0000	104.0000
6b7a98e1-dbbb-4f11-933d-f1c5d07a998b	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Follicle Stimulating Hormone	Hormones	4.3400	U/l	1.5000	12.4000
6ef2341e-1c04-4fdc-9353-bf2176cb9122	29d4607b-365b-469f-a149-3ab172834ba7	SHBG	Hormones	56.3000	nmol/L	18.3000	54.1000
77737299-bc79-4a7c-a750-71bdc8b28be6	29d4607b-365b-469f-a149-3ab172834ba7	WBC	Full Blood Count	3.9000	×10⁹/L	4.0000	11.0000
7af6bc23-a344-45d9-a6a0-45f2c06e1daf	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	FSH	Hormones	0.0000	IU/L	1.5000	12.4000
812bfb8f-3723-4a62-b564-5d8523481580	29d4607b-365b-469f-a149-3ab172834ba7	Lymphocytes	Full Blood Count	1.5300	×10⁹/L	1.0000	4.8000
87706cfa-c3f6-4d53-bf50-fc091d2f7f4d	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Total Cholesterol	Cholesterol	3.3800	mmol/L	\N	5.0000
8ad2c484-fd8f-4037-8db2-138ba2299180	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Haemoglobin	Full Blood Count	155.0000	g/L	130.0000	170.0000
8f5cfb6d-b7d5-43ec-9cb3-ada3da6ac999	29d4607b-365b-469f-a149-3ab172834ba7	MCV	Full Blood Count	79.4000	fL	80.0000	100.0000
92718375-1928-4d5f-88eb-10bac1a27e0a	29d4607b-365b-469f-a149-3ab172834ba7	Oestradiol	Hormones	102.0000	pmol/L	\N	146.0000
92f3fefd-bd2f-4422-ae70-525ff53cfb3c	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	WBC	Full Blood Count	4.6800	×10⁹/L	4.0000	11.0000
93ff7365-7a9e-4a0e-9dbf-0c4cbd99b9ad	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	eGFR	Kidney	75.0000	mL/min/1.73m²	60.0000	\N
997a5c24-39af-4c21-b03e-b4b877e0891b	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Oestradiol	Hormones	183.0000	pmol/L	\N	146.0000
99a35573-53b7-471c-b783-f57e9f65e87d	29d4607b-365b-469f-a149-3ab172834ba7	Bilirubin	Liver	10.0000	μmol/L	\N	21.0000
a00ed5e5-bf5c-4194-86e6-512eb4554ee2	29d4607b-365b-469f-a149-3ab172834ba7	RBC	Full Blood Count	5.7700	×10¹²/L	4.5000	5.9000
a7829758-620d-40e4-b202-d0d8dd7344cc	29d4607b-365b-469f-a149-3ab172834ba7	HDL	Cholesterol	1.5800	mmol/L	1.0000	\N
a7b4893d-b28d-44e4-b8cc-2de5f12653ca	29d4607b-365b-469f-a149-3ab172834ba7	Neutrophils	Full Blood Count	1.9700	×10⁹/L	1.8000	7.5000
ad744ba0-c56d-4c4a-8bfd-1fd431de25fb	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Testosterone	Hormones	15.9000	nmol/L	12.0000	30.0000
b1949fd1-2180-45f6-ba1e-79a98f0b5571	29d4607b-365b-469f-a149-3ab172834ba7	Total Testosterone	Hormones	27.6000	nmol/L	8.7000	29.0000
b6dbd4de-a38b-4f63-aec4-34c248c84f08	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Free T4	Thyroid	18.0000	pmol/L	12.0000	22.0000
bb7cd8a6-da65-4159-bc4e-7ef1a9bb75fa	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	RBC	Full Blood Count	5.9100	×10¹²/L	4.5000	5.9000
c47cbc8a-4506-4cfe-960b-06fea20d9276	29d4607b-365b-469f-a149-3ab172834ba7	Haemoglobin	Full Blood Count	153.0000	g/L	130.0000	170.0000
ca3888d4-5ea4-4f35-acf3-a03f930e1e10	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	LH	Hormones	0.0000	IU/L	1.7000	8.6000
cbb8fda7-1487-414d-91a2-35d29e30b2b4	29d4607b-365b-469f-a149-3ab172834ba7	TSH	Thyroid	3.0300	mIU/L	0.2700	4.2000
d2a92484-c2fd-4919-a3f6-6fad3513de0e	29d4607b-365b-469f-a149-3ab172834ba7	ALP	Liver	44.0000	U/L	30.0000	130.0000
d9ff0b8a-0a14-48ea-b569-3c99fc8c17c0	29d4607b-365b-469f-a149-3ab172834ba7	Creatinine	Kidney	118.4000	μmol/L	64.0000	104.0000
da4b768b-d91d-4e06-b237-3f03375fc715	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	HbA1c	Metabolic	30.8200	mmol/mol	\N	48.0000
e213bf9a-9221-4c05-a921-139d13e5ef33	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Total Testosterone	Hormones	54.7000	nmol/L	8.7000	29.0000
e315ea99-e6fd-4a71-a125-983472a2bbff	29d4607b-365b-469f-a149-3ab172834ba7	Platelets	Full Blood Count	174.0000	×10⁹/L	150.0000	400.0000
e46c4e22-d7bf-4c4d-87e4-65e9e73ebbbb	29d4607b-365b-469f-a149-3ab172834ba7	Albumin	Liver	45.6000	g/L	35.0000	50.0000
e612bada-bb0c-4552-b312-8e30b515f0a6	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	GGT	Liver	22.4000	U/L	\N	60.0000
e885ee95-5ebc-4874-91a1-b30508772926	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	MCV	Full Blood Count	81.9000	fL	80.0000	100.0000
e940babf-cbec-4ac2-aa13-2d43975d0857	29d4607b-365b-469f-a149-3ab172834ba7	Total Cholesterol	Cholesterol	3.2000	mmol/L	\N	5.0000
eabed950-b3ac-4e1e-abaa-10a4386d516d	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Luteinising Hormone	Hormones	5.1000	U/l	1.7000	8.6000
ef7d127d-79ab-4947-bc16-9d5508f5b967	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Platelets	Full Blood Count	219.0000	×10⁹/L	150.0000	400.0000
f1d30ce7-442f-4938-b076-0b81154a4e5b	29d4607b-365b-469f-a149-3ab172834ba7	Prolactin	Hormones	242.0000	mIU/L	\N	360.0000
f3a4a0d1-cac9-4bc0-bd7a-7945fc27aa2c	f857e1f6-f2ec-4f81-ae68-f67757b1d6f7	Sex Hormone Binding Globulin	Hormones	64.5000	nmol/L	10.0000	57.0000
f9bc7f4c-2885-4071-b402-c3735d22c8d9	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Haematocrit	Full Blood Count	46.0280	L/L	0.4000	0.5200
ff18e77e-3931-4e67-9e4d-e6ed7f32ae8e	1d5b5be7-3881-41c5-a6dd-0ee135f786bd	Albumin	Liver	47.9000	g/L	35.0000	50.0000
8e6a035f-a0c9-457f-b3ca-044e0fed1ca1	5517f816-fdd7-450c-8803-3332f61000e4	Testosterone	Hormones	54.7000	nmol/L	12.0000	30.0000
ce83613e-6075-440c-bfcb-0b808e13aa88	5517f816-fdd7-450c-8803-3332f61000e4	Free Testosterone	Hormones	0.9530	nmol/L	0.2260	0.6500
58d8ebb6-7c81-4dc0-9df7-967a885cb1c3	5517f816-fdd7-450c-8803-3332f61000e4	Luteinising Hormone	Hormones	0.0000	U/l	1.7000	8.6000
a3b7934d-1ce3-497e-84ca-48ed8858af16	5517f816-fdd7-450c-8803-3332f61000e4	Follicle Stimulating Hormone	Hormones	0.0000	U/l	1.5000	12.4000
729841a1-8efd-4f20-99be-c1e7e71e05e6	5517f816-fdd7-450c-8803-3332f61000e4	Oestradiol	Hormones	183.0000	pmol/L	41.0000	159.0000
88c4ccdb-8f7d-45c4-88b6-caae209ade89	5517f816-fdd7-450c-8803-3332f61000e4	Prolactin	Hormones	223.0000	mIU/L	86.0000	324.0000
c03a09fc-3fde-42e3-8a22-b8567ab43dae	5517f816-fdd7-450c-8803-3332f61000e4	Sex Hormone Binding Globulin	Hormones	61.3000	nmol/L	10.0000	57.0000
7c520db1-1b4c-4f6c-a833-408543a40882	5517f816-fdd7-450c-8803-3332f61000e4	Free Thyroxine	Hormones	18.0000	pmol/L	12.0000	22.0000
858bcfb4-0292-4993-9b56-8db4425579e9	5517f816-fdd7-450c-8803-3332f61000e4	Haematocrit	Hematology	46.0280	%	40.0000	52.0000
cdef143a-ecaf-443e-89fa-bb9a0d56cef0	5517f816-fdd7-450c-8803-3332f61000e4	Haemoglobin	Hematology	155.0000	g/L	130.0000	180.0000
36d50bda-65dc-424c-8820-cdccea729c10	5517f816-fdd7-450c-8803-3332f61000e4	Red Blood Cells	Hematology	5.9100	10^12/L	4.4000	6.5000
756bdfc7-2010-4aad-b69c-bd7afbcfe020	5517f816-fdd7-450c-8803-3332f61000e4	White Blood Cells	Hematology	4.6800	10^9/L	3.0000	11.0000
4a4e465a-41a9-485f-a449-7c343f837ac0	5517f816-fdd7-450c-8803-3332f61000e4	Lymphocytes	Hematology	1.4800	10^9/L	1.5000	4.5000
cd709268-44ad-4a34-b769-f6a66ffa6401	5517f816-fdd7-450c-8803-3332f61000e4	Monocytes	Hematology	0.3800	10^9/L	0.2000	0.8000
f3e99705-9bc4-4a40-9866-73aa72b2c02e	5517f816-fdd7-450c-8803-3332f61000e4	Neutrophils	Hematology	2.5700	10^9/L	2.0000	7.5000
330197f2-bbf8-4add-b54d-ecd450d22ece	5517f816-fdd7-450c-8803-3332f61000e4	Platelets	Hematology	219.0000	10^9/L	150.0000	450.0000
9790925a-8e13-4e50-83b5-99d6980ba5de	5517f816-fdd7-450c-8803-3332f61000e4	Mean Cell Volume	Hematology	81.9000	fL	80.0000	100.0000
7e3e2bb9-1b43-46e8-a1e1-2b77345d058d	5517f816-fdd7-450c-8803-3332f61000e4	Mean Cell Haemoglobin Concentration	Hematology	320.0000	g/L	320.0000	360.0000
63317aa3-625f-4dd6-a3dd-6ee576338048	5517f816-fdd7-450c-8803-3332f61000e4	Mean Cell Haemoglobin	Hematology	26.2000	pg	27.0000	33.0000
c247ead5-3f05-438c-9fd1-b4f074c2a8b5	5517f816-fdd7-450c-8803-3332f61000e4	Basophils	Hematology	0.0300	10^9/L	0.0000	0.1000
8654f96d-3bdf-4aab-9bd0-b7560ecc5ce2	5517f816-fdd7-450c-8803-3332f61000e4	Eosinophils	Hematology	0.2200	10^9/L	0.0000	0.4000
f7714bb7-42bd-4596-b08c-abb9a7d0413c	5517f816-fdd7-450c-8803-3332f61000e4	High-Density Lipoprotein	Lipids	1.3700	mmol/L	0.9000	1.7000
b8293da1-4ce2-451f-a310-9398680f32c4	5517f816-fdd7-450c-8803-3332f61000e4	Total Cholesterol	Lipids	4.6300	mmol/L	\N	5.0000
7a387c35-3063-4a31-b300-ebe9a3d5c26b	5517f816-fdd7-450c-8803-3332f61000e4	Total Cholesterol: HDL Ratio	Lipids	3.3800	ratio	\N	5.0000
51fdc212-7b45-4a19-8b79-aae386531c94	5517f816-fdd7-450c-8803-3332f61000e4	Alanine Transaminase	Liver	34.4000	U/L	\N	45.0000
10488bf9-77de-47fa-9590-62629d5fc9dc	5517f816-fdd7-450c-8803-3332f61000e4	Alkaline Phosphatase	Liver	47.0000	U/L	30.0000	130.0000
dd31924b-598e-4650-b909-84b785b44cb5	5517f816-fdd7-450c-8803-3332f61000e4	Gamma-Glutamyl Transferase	Liver	22.4000	U/L	8.0000	61.0000
39cfdbe2-3265-4a65-a1d5-34f760a619e8	5517f816-fdd7-450c-8803-3332f61000e4	Albumin	Liver	47.9000	g/L	35.0000	50.0000
34125bdd-b9f6-4b9d-b612-134a80ef139e	5517f816-fdd7-450c-8803-3332f61000e4	Bilirubin	Liver	9.6100	μmol/L	\N	22.0000
c73377d9-fdee-4d44-b880-820d51bd52ed	5517f816-fdd7-450c-8803-3332f61000e4	Creatinine	Kidney	116.2000	μmol/L	60.0000	120.0000
78f5d0fd-d458-44da-ad00-5752857545c6	5517f816-fdd7-450c-8803-3332f61000e4	Estimated Glomerular Filtration Rate	Kidney	75.0000	ml/min/1.73m2	60.0000	150.0000
51d72c1e-a645-40d6-abc1-0a86adaec4ce	5517f816-fdd7-450c-8803-3332f61000e4	Urea	Kidney	5.8100	mmol/L	2.5000	7.8000
fe73a2c5-f933-4154-8d91-b3e5b2e5a54c	5517f816-fdd7-450c-8803-3332f61000e4	Glycated Haemoglobin (HbA1c)	Metabolic	30.8200	mmol/mol	20.0000	42.0000
51b9155c-c14a-46d4-8489-ff6c06f302f6	5517f816-fdd7-450c-8803-3332f61000e4	Ferritin	Metabolic	143.5000	μg/L	30.0000	400.0000
08424a5b-8b69-4b96-bf9b-efd6742ff028	5517f816-fdd7-450c-8803-3332f61000e4	Prostate-Specific Antigen	Other	0.7900	μg/L	\N	2.5000
\.


--
-- Data for Name: bt_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bt_conversations (id, telegram_username, title, messages_json, created_at, updated_at) FROM stdin;
03rbsd8cd7y	iam0121	Are my liver markers OK?	[{"id": "0.crf5yudjyxb", "role": "user", "content": "Are my liver markers OK?", "timestamp": "2026-04-11T15:50:45.535Z"}, {"id": "0.30tvqpqb2fa", "role": "assistant", "content": "Your blood test results do not include liver markers like ALT, AST, or GGT. Therefore, I can't comment on their status based on this panel. You'd need to order a separate liver function test to get that information.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-11T15:50:48.294Z", "contextSession": {"id": "f857e1f6-f2ec-4f81-ae68-f67757b1d6f7", "testDate": "2026-04-06", "testName": "Randox"}}, {"id": "0.gvoxrahr46l", "role": "user", "content": "Why is my Prolactin elevated at 375 mIU/L?", "timestamp": "2026-04-11T16:13:33.106Z"}, {"id": "0.87wu7ihbp3e", "role": "assistant", "content": "Your **Prolactin** is elevated at **375 mIU/L** (ref: **86–324 mIU/L**), which is ⚠ OUT OF RANGE. Common causes in our community can include high stress, certain medications, or specific compounds like Trenbolone if you're on cycle. High **Oestradiol** (which yours isn't, at **91.8 pmol/L**) can sometimes contribute, but yours is fine here. It's worth retesting and considering potential stressors or compounds you're using.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-11T16:13:38.292Z", "contextSession": {"id": "f857e1f6-f2ec-4f81-ae68-f67757b1d6f7", "testDate": "2026-04-06", "testName": "Randox"}}, {"id": "0.dmp0af02kf", "role": "user", "content": "what LLM are you using", "timestamp": "2026-04-11T16:14:02.011Z"}, {"id": "0.0tg9q3vgis2", "role": "assistant", "content": "I'm not able to share information about the underlying technology.", "timestamp": "2026-04-11T16:14:02.745Z", "contextSession": null}, {"id": "0.wp2fgoym1s", "role": "user", "content": "how can i increase my test", "timestamp": "2026-04-11T16:14:18.024Z"}, {"id": "0.x0yic97dh3", "role": "assistant", "content": "Your **Free Testosterone** is low at **0.2 nmol/L** (ref: **0.226–0.65 nmol/L**) due in part to your elevated **Sex Hormone Binding Globulin (SHBG)** at **64.5 nmol/L** (ref: **10–57 nmol/L**). To increase **Free Testosterone**, focus on lowering **SHBG** with supplements like Boron (e.g., 6-10mg daily) and Stinging Nettle Root. Additionally, your elevated **Prolactin** at **375 mIU/L** could be contributing to symptoms, so addressing that, perhaps with P5P, could also be beneficial. Optimize diet, sleep, and resistance training to support overall T production.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-11T16:14:28.004Z", "contextSession": {"id": "f857e1f6-f2ec-4f81-ae68-f67757b1d6f7", "testDate": "2026-04-06", "testName": "Randox"}}, {"id": "0.2wld3s9g2lc", "role": "user", "content": "How can I sort myself out", "timestamp": "2026-04-11T16:14:49.684Z"}, {"id": "0.11nx1scebu3s", "role": "assistant", "content": "I can only help with health, fitness, peptides, blood tests, and related topics. Ask me something about your results or protocol.", "timestamp": "2026-04-11T16:14:50.325Z", "contextSession": null}, {"id": "0.jk1p1mc4id", "role": "user", "content": "sort out the bad blood tests", "timestamp": "2026-04-11T16:15:00.798Z"}, {"id": "0.w8p9b98555t", "role": "assistant", "content": "To address your **elevated SHBG** (**64.5 nmol/L**) and **low Free Testosterone** (**0.2 nmol/L**), consider supplementing with Boron (e.g., 6-10mg daily) and Stinging Nettle Root to help lower SHBG. For your **elevated Prolactin** (**375 mIU/L**), P5P (active B6, 100-200mg daily) is a common intervention. Additionally, ensure optimal sleep, nutrition, and resistance training, as these fundamentals support overall hormonal balance and Free T production.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-11T16:15:03.887Z", "contextSession": {"id": "f857e1f6-f2ec-4f81-ae68-f67757b1d6f7", "testDate": "2026-04-06", "testName": "Randox"}}]	2026-04-11 15:50:48.349421+00	2026-04-11 16:15:04.157+00
49ba2xq7241	penman123	Why is my lh and fsh low	[{"id": "0.sd8ztag8zq", "role": "user", "content": "Why is my lh and fsh low", "timestamp": "2026-04-12T21:35:04.836Z"}, {"id": "0.bnivteqff55", "role": "assistant", "content": "I can only help with health, fitness, peptides, blood tests, and related topics. Ask me something about your results or protocol.", "timestamp": "2026-04-12T21:35:04.939Z", "contextSession": null}, {"id": "0.eg0q9g9fqaw", "role": "user", "content": "hormones", "timestamp": "2026-04-12T21:35:12.271Z"}, {"id": "0.4m4q50d6rfv", "role": "assistant", "content": "I can only help with health, fitness, peptides, blood tests, and related topics. Ask me something about your results or protocol.", "timestamp": "2026-04-12T21:35:12.364Z", "contextSession": null}, {"id": "0.emidz2efmjo", "role": "user", "content": "whats my estrogen", "timestamp": "2026-04-12T21:35:21.888Z"}, {"id": "0.rxhr6i84jwl", "role": "assistant", "content": "Your **Oestradiol** is **183 pmol/L** (ref: 41–159 pmol/L), which is ⚠ **OUT OF RANGE** and significantly elevated. This is likely due to the very high **Testosterone** (**54.7 nmol/L**), as your body converts excess testosterone into oestrogen. Given your suppressed **LH** and **FSH** (both **0 U/l**), it's clear you're on exogenous testosterone, and this high oestrogen needs addressing to prevent side effects.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-12T21:35:24.261Z", "contextSession": {"id": "5517f816-fdd7-450c-8803-3332f61000e4", "testDate": "2026-04-03", "testName": "blood test voy"}}, {"id": "0.1jjbsclerqt", "role": "user", "content": "What should I watch for with Red Blood Cells?", "timestamp": "2026-04-12T21:35:43.195Z"}, {"id": "0.60iw9ygjcsw", "role": "assistant", "content": "Your **Red Blood Cells** (**5.91 10^12/L**, ref: 4.4–6.5 10^12/L), **Haemoglobin** (**155 g/L**, ref: 130–180 g/L), and **Haematocrit** (**46.028 %**, ref: 40–52 %) are currently within the reference range, though on the higher side. With exogenous testosterone, these markers can continue to rise. High levels increase blood viscosity, raising your risk of blood clots and cardiovascular issues. You should monitor these closely and discuss potential blood donation if they exceed the upper reference limits in future tests.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-12T21:35:48.768Z", "contextSession": {"id": "5517f816-fdd7-450c-8803-3332f61000e4", "testDate": "2026-04-03", "testName": "blood test voy"}}, {"id": "0.5swse6z6ys4", "role": "user", "content": "Is my Luteinising Hormone level dangerously low?", "timestamp": "2026-04-12T21:35:59.885Z"}, {"id": "0.vrmy8hpmgp", "role": "assistant", "content": "Your **Luteinising Hormone** (**LH**) is **0 U/l** (ref: 1.7–8.6 U/l), which is indeed ⚠ **OUT OF RANGE** and completely suppressed. While not \\"dangerously low\\" in the sense of an immediate health crisis from the LH itself, it's a critical indicator that your body's natural testosterone production is fully shut down due to exogenous hormone use. This is expected when on TRT or an AAS cycle.\\n\\n⚕️ Always consult a licensed healthcare professional before changing your protocol.", "timestamp": "2026-04-12T21:36:02.362Z", "contextSession": {"id": "5517f816-fdd7-450c-8803-3332f61000e4", "testDate": "2026-04-03", "testName": "blood test voy"}}, {"id": "0.dd4yshan1jd", "role": "user", "content": "Is my Mean Cell Haemoglobin level dangerously low?", "timestamp": "2026-04-12T21:36:17.569Z"}, {"id": "0.qap0q27vyg", "role": "assistant", "content": "I can only help with health, fitness, peptides, blood tests, and related topics. Ask me something about your results or protocol.", "timestamp": "2026-04-12T21:36:17.758Z", "contextSession": null}]	2026-04-12 21:35:04.995086+00	2026-04-12 21:36:17.811+00
\.


--
-- Data for Name: compound_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compound_logs (id, telegram_username, compound_name, compound_type, dose_amount, dose_unit, frequency, route, start_date, end_date, notes, created_at) FROM stdin;
\.


--
-- Data for Name: custom_couriers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_couriers (id, name, tracking_url_template, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (telegram_username, full_name, email, phone, address, account_status, notes, created_at, updated_at, tags) FROM stdin;
\.


--
-- Data for Name: delivery_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_methods (id, name, price, active, sort_order, created_at, updated_at) FROM stdin;
dm-inpost	InPost	3.00	t	2	2026-03-18 15:19:10.662+00	2026-03-18 15:19:10.662+00
dm-international	International	8.50	f	3	2026-03-18 15:19:10.665+00	2026-03-18 15:19:10.665+00
dm-royal-mail	Royal Mail	10.00	t	1	2026-03-18 15:19:10.655+00	2026-03-18 15:19:10.655+00
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback (id, type, message, telegram_username, created_at) FROM stdin;
\.


--
-- Data for Name: fs3_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fs3_costs (id, product_name, unit_cost, created_at, updated_at) FROM stdin;
76	Semaglutide 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
77	Tirzepatide 10mg	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
78	Tirzepatide 15mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
79	Tirzepatide 20mg	70.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
80	Tirzepatide 30mg	80.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
81	Tirzepatide 45mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
82	Tirzepatide 60mg	120.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
83	Tirzepatide 100mg	190.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
84	Retatrutide 10mg	80.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
85	Retatrutide 20mg	105.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
86	Retatrutide 30mg	130.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
87	Retatrutide 40mg	150.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
88	Retatrutide 50mg	185.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
89	Retatrutide 100mg	380.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
90	Cagrilintide 5mg	90.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
91	Cagrilintide 10mg	170.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
92	Mazdutide 10mg	160.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
93	Survodutide 10mg	150.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
94	GAC water 10ml	25.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
95	BAC water 10ml	25.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
96	GAC water 3ml	15.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
97	BAC water 3ml	15.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
98	L-Carnitine 500mg×20ml×10vials Water	160.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
99	Cyanocobalamin B12 1mg ×10ml×10vials water	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
100	HGH 10IU	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
101	IGF-1 LR3 1mg	180.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
102	5-Amino-1MQ 50mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
103	5-Amino-1MQ 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
104	Adipotide 10mg	165.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
105	VIP 10mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
106	Bpc 157 10mg	35.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
107	BPC 157 10mg	35.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
108	Bpc 157 40mg	125.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
109	BPC 157 40mg	125.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
110	TB500(TB4) 10mg	85.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
111	TB500 (TB4) 10mg	85.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
112	TB500(TB4) 20mg	150.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
113	TB500 (TB4) 20mg	150.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
114	Abaloparatide 3mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
115	Teriparatide 750mcg	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
116	Fragment 176-191 5mg	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
117	Fragment 176–1915mg	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
118	PT141 10mg	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
119	Pt141 10mg	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
120	Kisspeptin-10mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
121	Kisspeptin 10mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
122	Epitalon 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
123	Epitalon 50mg	200.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
124	N-Acetyl Epitalon 20mg	80.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
125	Melanotan II 10mg	35.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
126	Melanotan I 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
127	CJC-1295 with Dac 5mg	90.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
128	CJC-1295 with DAC 5mg	90.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
129	CJC-1295 No Dac 10mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
130	CJC-1295 No DAC 10mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
131	Tesa / IPA / CJC No DAC 6/3/3mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
132	GHRP-6 10mg	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
133	GHRP-2 10mg	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
134	Tesamorelin 10mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
135	Tesamorelin 20mg	190.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
136	Mots-C 10mg	45.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
137	Mots-C 20mg	90.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
138	Mots-C 40mg	135.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
139	SS-31 10mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
140	SS-31 30mg	135.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
141	SS-31 50mg	200.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
142	Ipamorelin 10mg	65.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
143	Thymosin Alpha-1 10mg	95.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
144	Thymulin 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
145	Adamax 10mg	240.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
146	Adamax 10mg（1032 da)	240.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
147	Semax 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
148	Selank 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
149	Na semax	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
150	Na Semax	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
151	Na selank	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
152	Na Selank	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
153	IllumiNeuro	240.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
154	Fox04 10mg	240.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
155	Oxytocin 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
156	Snap-8 10mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
157	DSIP 5mg	35.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
158	DSIP 10mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
159	BPC 5mg/TB4 5mg blend	70.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
160	BPC 10mg/TB4 10mg blend	120.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
161	CJC No Dac/ipa 5/5mg	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
162	CJC No DAC / Ipa 5/5mg	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
163	CJC 6mg/ipa 11mg blend	145.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
164	CJC 6mg / Ipa 11mg Blend	145.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
165	Tesa 5mg/ipa 5mg blend	110.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
166	Tesa 5mg / Ipa 5mg Blend	110.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
167	Tesa 10mg/ipa 3mg blend	145.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
168	Tesa 10mg / Ipa 3mg Blend	145.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
169	AHK-CU 100mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
170	GHK-CU 100mg	51.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
171	GHK-CU 50mg	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
172	NAD+500mg buffer ph6-6.5	95.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
173	NAD+ 500mg Buffer pH6-6.5	95.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
174	TB500 frag 10mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
175	TB500 Frag 10mg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
176	Pnc 27 30mg	240.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
177	PNC 27 30mg	240.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
178	Ll 37 5mg	85.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
179	LL-37 5mg	85.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
180	KPV 10mg	45.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
181	Kpv 30mg	110.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
182	KPV 30mg	110.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
183	Sermorelin 5mg	70.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
184	KPV & GHK-CU Blend	5.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
185	GLOW(TB4 10+BP 10+GHK50)	110.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
186	GLOW (TB4 10mg + BPC 10mg + GHK 50mg)	110.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
187	KLOW	150.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
188	KLOW (TB10+BPC10+KPV10+GHK50)	150.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
189	Pe-22-28 10mg	55.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
190	PE-22-28 10mg	55.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
191	Ara-290 16mg	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
192	Tri-Heal Max	380.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
193	Slup-332 500mcg	60.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
194	Bam-15 50mg	300.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
195	Bam-15 50mg (usa no resend)	300.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
196	Slu 100mcg/bam25mg blend 60TABS)	95.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
197	SLU 100mcg / BAM 25mg Blend 60 Tabs	95.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
198	HCG 1000 IU GMP	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
199	HCG 2000 IU GMP	70.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
200	HCG 5000 IU GMP	175.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
201	HCG 1000 IU GMP 3ml 10vials	40.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
202	HCG 2000 IU GMP 3ml 10vials	70.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
203	HCG 5000 IU GMP 3ml 10vials	175.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
204	Glutathione 600mg GMP 10ML 10vials	45.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
205	Glutathione 1500mg GMP 20ML 10vials	85.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
206	HMG 75IU X 10vials GMP	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
207	Cerebrolysin 30mg GMP 10ML 10vials	45.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
208	Prostamax 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
209	Pinealon 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
210	Ovagen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
211	Vesugen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
212	Bronchogen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
213	Vilon 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
214	Cartalax 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
215	Cortagen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
216	Chonluten 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
217	Livagen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
218	Testagen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
219	Cardiogen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
220	Pancragon 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
221	Thymogen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
222	Crystagen 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
223	Vesilute 20mg	100.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
224	GHK-CU 10g - Raw	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
225	GHK-CU 10g Raw	75.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
226	AHK-CU 10g - Raw	175.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
227	AHK-CU 10g Raw	175.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
228	SNAP-8 1g	95.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
229	SNAP-8 10g	785.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
230	BPC 157 - 500mcg tablets	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
231	BPC 157 500mcg Tablets	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
232	KPV - 500mcg tablets	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
233	KPV 500mcg Tablets	50.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
234	Humanin - [Purity not Guaranteed]	155.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
235	Humanin [Purity not Guaranteed]	155.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
236	Orforglipron 12mg	120.00	2026-03-19 17:37:47.982+00	2026-03-19 17:37:47.982+00
237	BPC 10mg / TB4 10mg Blend	120.00	2026-03-19 17:42:14.458+00	2026-03-19 17:42:14.458+00
238	BPC 5mg / TB4 5mg Blend	70.00	2026-03-19 17:42:28.632+00	2026-03-19 17:42:28.632+00
239	CJC No DAC / Ipa 10/10mg	165.00	2026-03-19 17:42:45.922+00	2026-03-19 17:43:57.861+00
242	CJC No Dac/ipa 10/10mg	165.00	2026-03-19 17:43:57.914+00	2026-03-19 17:43:57.914+00
\.


--
-- Data for Name: gb_waitlist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gb_waitlist (id, group_buy_id, account_id, joined_at, notified_at) FROM stdin;
\.


--
-- Data for Name: glp1_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.glp1_logs (id, telegram_username, logged_date, compound_name, dose_mg, weight_kg, weight_unit, notes, created_at, injection_site, side_effects, calories, protein_g, water_ml) FROM stdin;
f4ee223c-d391-457a-aafa-d3897a6bcdfb	iam0121	2026-04-01	Semaglutide	2.500	80.000	kg	Shot at 09:25	2026-04-11 08:26:33.885084+00	\N	\N	\N	\N	\N
8eb09976-5b37-472a-ad4f-70f903e431f3	iam0121	2026-04-05	Semaglutide	78.000	78.000	kg	Shot at 09:26	2026-04-11 08:27:01.255601+00	abdomen-right	\N	\N	\N	\N
ba039cc8-02b4-435f-9cba-1d741cfac17f	iam0121	2026-04-11	Semaglutide	5.000	75.000	kg	Shot at 09:26	2026-04-11 08:27:14.726272+00	abdomen-left	\N	\N	\N	\N
\.


--
-- Data for Name: group_buy_delivery_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_buy_delivery_methods (id, group_buy_id, delivery_method_id) FROM stdin;
\.


--
-- Data for Name: group_buy_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_buy_products (id, group_buy_id, product_id, price_override, active, sort_order) FROM stdin;
fd92a039-a820-4cfb-9bb0-e99ac2b0e876	H64PT	p027	\N	t	\N
e038356d-afa4-4f99-b209-620f27ff2111	H64PT	p026	\N	t	\N
52c521b2-54df-4886-a194-0c65bedfa230	H64PT	p034	\N	t	\N
c51808b7-b468-4455-a6d5-33dfc633efbd	H64PT	p060	\N	t	\N
a04e8cd6-d0cf-45ff-bbdc-5b42dd7aaae2	H64PT	p028	\N	t	\N
77e1620d-c2c7-44ab-b21c-6de3ef86e6b8	H64PT	p077	\N	t	\N
89ccc899-9ace-4b82-a259-ce29501c217f	H64PT	p120	\N	t	\N
7a1b55e0-0925-4337-a2be-f5f9287e6993	H64PT	p091	\N	t	\N
14d4f94a-b7b6-4e73-b28a-2c5464b16ba2	H64PT	p019	\N	t	\N
325cb578-500a-43fd-9ce8-b34b326436ea	H64PT	p021	\N	t	\N
50c783dc-8706-44b4-90a6-7c62bee28044	H64PT	p094	\N	t	\N
8d022a91-62b9-4458-bc79-27c389b019f8	H64PT	p072	\N	t	\N
6a9b8d7c-d1e8-4ef5-a74c-55fdf1ed12ff	H64PT	p030	\N	t	\N
abea11a4-0d53-4d54-b0ce-fec8d258e110	H64PT	p031	\N	t	\N
901ceb45-2c05-4c65-89d5-93ba37f3be92	H64PT	p123	\N	t	\N
f7b4acfb-bbd5-44e2-978e-9f9ebb27d7b5	H64PT	p071	\N	t	\N
39fcf213-18cd-49aa-93ea-90fa8c59f823	H64PT	p107	\N	t	\N
ad8d8cca-a86c-4415-9e23-679bb660410d	H64PT	p015	\N	t	\N
04b5227c-9757-4f49-b797-c1645f471dc3	H64PT	p014	\N	t	\N
5ca3fdec-f880-4bd7-ba21-dc0a4b585638	H64PT	p114	\N	t	\N
6f72690c-cdfb-4033-ac85-d52ca1da0d8c	H64PT	p109	\N	t	\N
7827cdf9-2106-47c2-9dba-e4163a91a6ce	H64PT	p102	\N	t	\N
511c5ba0-fbd3-464b-8136-db2f8a6a27d8	H64PT	p111	\N	t	\N
a69fcb81-6969-4598-b1c0-c98fccc0656b	H64PT	p074	\N	t	\N
d475f36a-c9c8-490d-b7ae-c028d3c644a4	H64PT	p073	\N	t	\N
525f63a2-c8c9-4803-9335-280c47d0751f	H64PT	p045	\N	t	\N
ae92495e-fd61-49a5-8aa3-d4af65ee71b6	H64PT	p044	\N	t	\N
d1dc8757-2ff0-45e0-80e5-a02f7e5ee1a0	H64PT	p110	\N	t	\N
c4dcd057-bc82-48ca-a03f-1e0c3823fc2d	H64PT	p117	\N	t	\N
8e8c7a2b-7b6c-4f45-9a41-fad7946d8c4b	H64PT	p023	\N	t	\N
b125d778-8083-418c-9ee2-d17df4e8ebde	H64PT	p070	\N	t	\N
5d61ce3f-56ba-4bec-b1fa-9e39dc8e2139	H64PT	p069	\N	t	\N
c4daccd7-e7a1-47cf-9500-f79f066cbb1e	H64PT	p039	\N	t	\N
99b1ee4f-3d25-4f0c-8c6d-9ad1a3f781da	H64PT	p040	\N	t	\N
77aee00f-71ff-4d83-b06e-ebea7a98ced5	H64PT	p066	\N	t	\N
a82fe925-ef6f-41c1-b3c3-e840a782e3d8	H64PT	p036	\N	t	\N
c4e68284-f314-4dea-93bb-30acd4b8ef2d	H64PT	p018	\N	t	\N
ce146465-d8c3-4b2e-a46a-056939399979	H64PT	p020	\N	t	\N
ee06090e-3115-4d04-955f-9e75ba2cbc4f	H64PT	p078	\N	t	\N
80de373f-16d0-4862-989e-b00dc2b7195c	H64PT	p119	\N	t	\N
d79ebf38-ab51-416a-a83c-109d98de38e6	H64PT	p079	\N	t	\N
02a92185-d852-4f29-b4e7-f6c80c40fc92	H64PT	p048	\N	t	\N
644f6ac7-3abf-4f74-9a68-cd6a36fdb8f0	H64PT	p047	\N	t	\N
32dd937d-8102-4e7b-acf4-06e01c9fdabb	H64PT	p088	\N	t	\N
599c3642-693c-4fdb-bd70-f959c5a69342	H64PT	p100	\N	t	\N
40bded10-f376-49b6-9881-1ef3bd50e8c1	H64PT	p099	\N	t	\N
8864d36f-f0f5-43b6-b7df-4726ed82f2f5	H64PT	p096	\N	t	\N
c264bdd7-a923-4646-ba49-6c067f166ab3	H64PT	p097	\N	t	\N
570a6ea1-217e-41da-98a6-8380506aed2a	H64PT	p098	\N	t	\N
363b0fac-775a-4856-a0d0-fa064a932a4c	H64PT	p024	\N	t	\N
4f397577-3f0f-47fe-8e66-c956ac699d95	H64PT	p101	\N	t	\N
cb72a2b5-f370-46c4-9475-3ad5b9dd6248	H64PT	p125	\N	t	\N
4fdcd773-3bd8-482f-af99-b483c6eaa365	H64PT	p025	\N	t	\N
1b2e8d56-2281-41c0-b8f1-abfe48f7eb5f	H64PT	p065	\N	t	\N
6762a221-df09-4b26-855e-a54bd74b8c8f	H64PT	p057	\N	t	\N
807a7b98-6742-4c3b-92a0-aeec95487187	H64PT	p038	\N	t	\N
dcb4e93d-482d-436f-b771-92edd64e4dbf	H64PT	p089	\N	t	\N
2686707a-a343-45ac-8b28-5129ac579049	H64PT	p087	\N	t	\N
9fdff259-82f8-4aba-af4e-a205908cecf2	H64PT	p084	\N	t	\N
db7a4631-30af-492e-a71d-b7cd1ec253b4	H64PT	p085	\N	t	\N
72a3fe92-aa8a-47f8-92db-00e56a972dd0	H64PT	p124	\N	t	\N
e5cd3a07-7c66-4fc9-bafe-b5242b906549	H64PT	p022	\N	t	\N
ee536ed3-6604-444c-ad38-24529315c471	H64PT	p112	\N	t	\N
dfb4e949-5bd6-42bd-8f23-132b7a66f6e1	H64PT	p083	\N	t	\N
41aa9c73-f1e2-485b-b125-a44bc93e146a	H64PT	p016	\N	t	\N
93643e43-c966-4ccb-b572-3a26654a5fbb	H64PT	p043	\N	t	\N
95d591e6-b29a-4b83-adfc-4ca8c62501a1	H64PT	p042	\N	t	\N
d5ed36ff-4d2c-46c2-b6e7-f31ffbc7541e	H64PT	p051	\N	t	\N
eebee9e1-0222-4b41-a353-0a39d03bc9a3	H64PT	p052	\N	t	\N
3f463781-c509-4ce9-b467-97432ea7b0c5	H64PT	p053	\N	t	\N
7e5f3fbf-8f9b-4450-b293-bcd64f281a7a	H64PT	p041	\N	t	\N
1dddcf45-42ce-4c5e-b912-731f369b2586	H64PT	p064	\N	t	\N
0388181b-7449-473d-adc9-c34b62e8d63d	H64PT	p063	\N	t	\N
a7c64dc7-599b-4501-af0f-94bd150cde44	H64PT	p080	\N	t	\N
61854eaa-b52c-4864-bea6-76e7f195c8b1	H64PT	p126	\N	t	\N
c5435da7-7639-4f19-a63c-6ebd7b63e8c6	H64PT	p105	\N	t	\N
0bf8aa25-8dad-41f7-bb0b-ca914207b33e	H64PT	p067	\N	t	\N
554b750a-dae1-4a6a-a161-6d38f864ed8c	H64PT	p115	\N	t	\N
66ca56ec-3bd5-4680-a0fd-0f6ec3f316d9	H64PT	p090	\N	t	\N
b0f90ae2-67b5-4063-ab3d-ad7b055f8dda	H64PT	p104	\N	t	\N
fb09b43a-a004-4bcf-86ce-c176a8385981	H64PT	p082	\N	t	\N
48db396e-4d9c-4326-ad70-25596a726194	H64PT	p103	\N	t	\N
4d715566-0259-4b01-829b-11999357c41c	H64PT	p037	\N	t	\N
2e7002c4-e566-40d2-8573-f57d7eeba386	H64PT	p009	\N	t	\N
dc0e7924-9400-4d9c-8281-10d7c96b8bbb	H64PT	p010	\N	t	\N
6863ab8e-5207-4973-a42a-9f2d2ce6f3b4	H64PT	p011	\N	t	\N
8e613ab9-39c1-46db-87f5-9395718495eb	H64PT	p012	\N	t	\N
813a3d94-0f56-4032-a663-8f222611e425	H64PT	p013	\N	t	\N
dfed1947-2a57-4d0a-b655-c2a6b2608ff8	H64PT	p062	\N	t	\N
a733b8e7-8863-44cd-84af-3b09dc540f9c	H64PT	p001	\N	t	\N
5c18cc04-671a-4242-a0ed-60cfe40ee01b	H64PT	p061	\N	t	\N
3a86ad4b-7581-4244-a793-34de36d78413	H64PT	p086	\N	t	\N
e01cdbb7-64c4-4b75-af1a-1e2d6168e19a	H64PT	p095	\N	t	\N
4b1a74dc-c740-41a4-8d63-3088661f00b8	H64PT	p093	\N	t	\N
fbf72e46-a8fe-4a14-9a58-d39c06c77f94	H64PT	p122	\N	t	\N
ddb9138e-24ab-4d59-bb51-8cab551ba337	H64PT	p068	\N	t	\N
4ed43c67-4a07-4f6d-9950-bf3ca8a4914a	H64PT	p121	\N	t	\N
1e49c86e-5468-4604-9cca-ff2e41262655	H64PT	p054	\N	t	\N
06287ca7-ce49-4d93-8397-d9997ffc527a	H64PT	p055	\N	t	\N
0a38b151-00ae-431b-b628-4268db9484ed	H64PT	p056	\N	t	\N
c1b4b821-3cc3-4138-9708-8bdabf8ae4a1	H64PT	p017	\N	t	\N
5ec929a6-43cc-4002-9c3b-a57e0e2e8bc8	H64PT	p032	\N	t	\N
67ebcc73-b098-47fc-bb82-4fb470b5c4fa	H64PT	p033	\N	t	\N
de3ace28-4bce-44a9-974c-50fadf9ab049	H64PT	p081	\N	t	\N
adb2c2e0-7019-49ea-9c2c-581fdc810c78	H64PT	p035	\N	t	\N
e9dbe8c5-62ab-4a03-a620-17a73e12ac25	H64PT	p046	\N	t	\N
2527d8d2-76ec-4554-913e-494bf0d73a64	H64PT	p076	\N	t	\N
7951f318-b96a-4e11-97cf-ae08b7e9c4b5	H64PT	p075	\N	t	\N
d7d42972-ef0b-4a0c-8e9b-caaf0f60aa50	H64PT	p049	\N	t	\N
8f8a7b70-239b-49bd-aa36-1a6960f340d2	H64PT	p050	\N	t	\N
a3c8f520-0879-4f72-b610-99cad32a26fc	H64PT	p113	\N	t	\N
3eba30a9-622f-4847-8e95-48398d916113	H64PT	p116	\N	t	\N
78851953-2e2f-44d6-b50a-c997041cceaa	H64PT	p058	\N	t	\N
2c9621c7-d8a4-4b51-9eb0-87a828d5c9d8	H64PT	p059	\N	t	\N
e16f86e2-030f-4167-9766-0f6f1ae061d2	H64PT	p008	\N	t	\N
eb4ef2d3-dfa8-48d2-bda1-9329a2eca0cd	H64PT	p002	\N	t	\N
9b3a9e06-845e-4627-9c9f-9175320a3550	H64PT	p003	\N	t	\N
591734c7-603e-4d66-9561-3e6b6f87311c	H64PT	p004	\N	t	\N
726cd6ff-67af-45d3-a10f-e118e110235c	H64PT	p005	\N	t	\N
9f1b1b16-7f65-4c9f-80aa-10ba1920060f	H64PT	p006	\N	t	\N
83f50748-e464-4284-8821-43d70e183ea4	H64PT	p007	\N	t	\N
f3186cc6-cefb-442f-b299-37ec0820d6c9	H64PT	p092	\N	t	\N
faf23937-14cb-4905-ae88-f27b18e64d29	H64PT	p118	\N	t	\N
565f21b4-5b13-4ed0-ac98-d6e503f73b42	H64PT	p106	\N	t	\N
56021119-0b93-45b7-b909-bdf1d76744c9	H64PT	p108	\N	t	\N
19407d27-46da-4a12-bd5a-d3a2c8872a03	H64PT	p029	\N	t	\N
82ddd3f2-7120-464a-9b0b-c1dfe1ff5059	P43JH	prod-a99cdfc0	\N	t	\N
\.


--
-- Data for Name: group_buys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_buys (id, name, description, status, close_date, invite_pin_hash, manufacturer, manufacturer_country, info_cards, currency, sort_order, created_at, updated_at, shipping_options, lab_test_supplier, testing_enabled, vendor_shipping_enabled, vendor_shipping_message, payment_message_enabled, payment_message, payments_enabled, member_limit, min_members, organiser_id, approval_status, organiser_payments, pnl_costs, allowed_countries, excluded_countries, vendor_shipping_amount, admin_fee_enabled, admin_fee_amount, admin_fee_label) FROM stdin;
BBXDR	WW R140 & CAG10 GB	\N	archived	2026-04-18 00:00:00+00	\N	Biochems API	\N	\N	USD	\N	2026-04-11 10:25:30.463219+00	2026-04-12 21:09:48.266+00	\N	\N	f	f	\N	t	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
1794d939-ca34-40f9-b2e0-d6777482f040	Uther GB	Uther	archived	2026-04-22 00:00:00+00	\N	Uther	\N	[{"id":"c32vs1wy","title":"test","body":"trest","icon":""}]	USD	\N	2026-04-06 08:17:56.675+00	2026-04-12 21:09:50.148+00	\N	Uther	t	f	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
P43JH	test	\N	active	\N	$2b$10$GD2zS8.VBm6pfKAwuWX.Du9lrrOumhGwtBqNvcFebUb/4j.64SPn2	\N	\N	[{"title":"test","body":"test","type":"update"}]	GBP	\N	2026-04-13 07:20:46.75881+00	2026-04-13 18:12:10.175+00	[{"id":"ship-1776081067983","label":"Royal Mail","description":"","price":0}]	\N	f	f	\N	f	\N	t	\N	1	iam0121	approved	{"paypalHandle": "pen", "cryptoNetwork": "ERC-20 (Ethereum)", "revolutHandle": "@pen", "cryptoCurrency": "USDT", "cryptoWalletAddress": "0x44565d299D53244FC0fFB59863bf777b9A52BE30"}	\N	\N	\N	\N	f	\N	\N
H64PT	Uther April Group Buy	\N	active	\N	\N	Uther	\N	[{"id":"629njw1i","title":"Order will be made for peptides in stock","body":"Order will be made for peptides in stock","icon":"","type":"important"},{"id":"igfw4q0k","title":"","body":"","icon":""}]	USD	1	2026-04-12 21:12:44.467429+00	2026-04-13 19:38:08.552+00	[{"id":"cle4zs2n","label":"DHL","price":10}]	Uther	t	t	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: lab_tests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_tests (id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code, purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes, is_third_party_test, pending, created_at, lab_name, test_type, product_category, heavy_metal_as, heavy_metal_cd, heavy_metal_pb, heavy_metal_hg, submitted_by, ai_extracted, ai_extracted_at, organiser_id, group_buy_id, mass_unit) FROM stdin;
2	91819	https://janoshik.com/tests/91819-Ghkcu_50mg_HK501126HK5011261_DR8F4EUKM5GA	GHK-Cu	50	Uther	HK50-1126/HK50-1126-1	99.645	\N	\N	2025-12-08	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:10:42.463	\N	\N	mg
5	92154	https://janoshik.com/tests/92154-Tb_500_10mg_TB4101127_KGZGJN4C41FY	TB-500	10	Uther	TB410-1127	99.806	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:14:14.062	\N	\N	mg
4	92172	https://janoshik.com/tests/92172-Cortagen_20mg_CORGEN201111_BIHMLJAM1ZNN	Cortagen	20	Uther	CORGEN20-1111	99.919	\N	\N	2025-12-08	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:25:59.029	\N	\N	mg
7	92167	https://janoshik.com/tests/92167-semax_10mg_SX101110_TS8GT7L5F6PG	Semax	10	Uther	SX10-1110	99.672	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:09.762	\N	\N	mg
8	92169	https://janoshik.com/tests/92169-bpc_157_10mg_BP101110_KMZTY8DBGSA8	BPC-157	10	Uther	BP10-1110	99.776	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:14.823	\N	\N	mg
9	92174	https://janoshik.com/tests/92174-Cartalax_20mg_CALAX201111_97JA3RPCNEY4	Cartalax	20	Uther	CALAX20-1111	99.86	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:19.736	\N	\N	mg
11	92171	https://janoshik.com/tests/92171-na_semax_10mg_NASX101111_I9NQCBVVIQ95	NA-Semax	10	Uther	NASX10-1111	99.907	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:30.069	\N	\N	mg
13	91807	https://janoshik.com/tests/91807-Semax_10mg_SX101125_X87K3NXG143D	Semax	10	Uther	SX10-1125	98.784	\N	\N	2025-12-08	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:40.128	\N	\N	mg
15	92162	https://janoshik.com/tests/92162-ipa_10mg_IP101127_5GX81BILMQDS	Ipamorelin	10	Uther	IP10-1127	99.649	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:50.46	\N	\N	mg
19	92853	https://janoshik.com/tests/92853-kpv_10mg_KP101129_MLDQC7YR6V78	KPV	10	Uther	KP10-1129	99.731	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:10.499	\N	\N	mg
20	92859	https://janoshik.com/tests/92859-cjc_no_dac10mg_CJND101129_GT3YPNK578YM	CJC-1295 (no DAC)	10	Uther	CJND10-1129	99.194	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:15.465	\N	\N	mg
23	92844	https://janoshik.com/tests/92844-PT141_10mg_PT101128_LDRDKT29QK3A	Pt141	10	Uther	PT10-1128	\N	1.36	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:31.152	\N	\N	mg
24	92847	https://janoshik.com/tests/92847-reta_50mg_RE501128_6BEI9BG1Y9HW	Retatrutide	50	Uther	RE50-1128	\N	6.306	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:36.228	\N	\N	mg
25	92851	https://janoshik.com/tests/92851-Tir30mg_ZE301129_DWTHLF1M8N8Y	Tirzepatide	30	Uther	ZE30-1129	\N	8.126	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:40.922	\N	\N	mg
27	92861	https://janoshik.com/tests/92861-cjc_no_dac10mg_CJND101129_HC1P3CNT6SA9	CJC-1295 (no DAC)	10	Uther	CJND10-1129	\N	0.487	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:51.771	\N	\N	mg
28	92867	https://janoshik.com/tests/92867-LL37_5mg_LL51130_D6NA7T5MXE93	LL-37	5	Uther	LL5-1130	\N	0.27	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:56.533	\N	\N	mg
30	92857	https://janoshik.com/tests/92857-tesa_10mg_TE101129_GPMYU95ZREI3	Tesamorelin	10	Uther	TE10-1129	\N	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:06.297	\N	\N	mg
32	92173	https://janoshik.com/tests/92173-SS31_50mg_SS501111_9RNDSTSMQ175	SS-31	50	Uther	SS50-1111	99.269	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:16.727	\N	\N	mg
33	92846	https://janoshik.com/tests/92846-reta_50mg_RE501128_XFHB4MTD82TV	Retatrutide	50	Uther	RE50-1128	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	other	\N	\N	\N	\N	\N	t	2026-04-11 22:28:21.56	\N	\N	mg
34	92850	https://janoshik.com/tests/92850-Tir30mg_ZE301129_DD6W93EDBG34	Tirzepatide	30	Uther	ZE30-1129	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:26.729	\N	\N	mg
36	92879	https://janoshik.com/tests/92879-Na_semax_50mg_NASX501130_81JQ27B6IXNG	NA-Semax	50	Uther	NASX50-1130	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:36.496	\N	\N	mg
39	93073	https://janoshik.com/tests/93073-Adipotide_10mg_ADI101201_PQ4MVYE3R7TB	Adipotide	10	Uther	ADI10-1201	99.549	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:51.239	\N	\N	mg
40	93074	https://janoshik.com/tests/93074-Fox04_10mg_FO101201_6FDLSCMUDAHN	FOXO4-DRI	10	Uther	F010-1201	99.724	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:56.683	\N	\N	mg
41	93075	https://janoshik.com/tests/93075-Motsc_10mg_MO101201_WNPL1PP762QK	MOTS-C	10	Uther	M010-1201	99.565	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:02.127	\N	\N	mg
44	93072	https://janoshik.com/tests/93072-sema10mg_OZ101201_GUAHMNTXBT7X	Semaglutide	10	Uther	OZ10-1201	99.784	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:17.29	\N	\N	mg
45	93078	https://janoshik.com/tests/93078-reta20mg_RE201202_RIBKBX6GVQCZ	Retatrutide	20	Uther	RE20-1202	99.956	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:22.033	\N	\N	mg
47	93200	https://janoshik.com/tests/93200-Tir_15mg_ZE151205_UD3E75X1ZY1Y	Tirzepatide	15	Uther	ZE15-1205	99.889	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:32.014	\N	\N	mg
48	93203	https://janoshik.com/tests/93203-ghkcu_100mg_HK1001205_YZFZ5K8A2DRC	GHK-Cu	100	Uther	HK100-1205	99.818	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:37.172	\N	\N	mg
51	93082	https://janoshik.com/tests/93082-bpc20mg_BP201203_MH2FVL5UCUNS	BPC-157	20	Uther	BP20-1203	99.693	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:52.919	\N	\N	mg
53	91147	https://janoshik.com/tests/91147-thymulin_20mg_THYMU201121_ZX96P8SIY4BJ	Thymulin	20	Uther	THYMU20-1121	99.525	\N	\N	2025-12-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:03.528	\N	\N	mg
54	92848	https://janoshik.com/tests/92848-Tir30mg_ZE301129_XTNZD42V3QDY	Tirzepatide	30	Uther	ZE30-1129	99.538	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:10.531	\N	\N	mg
17	92159	https://janoshik.com/tests/92159-Coremend_CORE451127_GWQGWDB7UD8H	Coremend	\N	Uther	CORE45-1127	\N	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:07.269	\N	\N	mg
21	92862	https://janoshik.com/tests/92862-Cjcipa_1010_cI10101130_986IXDSZFAE9	CJC + Ipamorelin	\N	Uther	c/11010-1130	\N	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:13.896	\N	\N	mg
38	93199	https://janoshik.com/tests/93199-glow_GL701204_R74PCJVXZPNI	Glow	\N	Uther	GL70-1204	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:19.745	\N	\N	mg
55	93202	https://janoshik.com/tests/93202-tbbp_55_TB551205_2TU9UTH3YKLZ	TB4 + BPC-157	\N	Uther	T/B55-1205	\N	\N	\N	2025-12-15	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:31.214	\N	\N	mg
57	93084	https://janoshik.com/tests/93084-ta1_10mg_TA1101203_2BQ733538HXB	TA-1	10	Uther	TA110-1203	99.778	\N	\N	2025-12-15	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:25.597	\N	\N	mg
59	92164	https://janoshik.com/tests/92164-ahkcu_100mg_AHK1001128_SJMYJPRYA2C1	AHK-Cu	100	Uther	AHK100-1128	99.036	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:35.947	\N	\N	mg
61	93201	https://janoshik.com/tests/93201-epi_10mg_EPI101205_YHRVQLU9D2ES	Epitalon	10	Uther	EPI10-1205	99.759	\N	\N	2025-12-17	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:46.428	\N	\N	mg
62	94371	https://janoshik.com/tests/94371-reta_50mg_RE501128_II8X35P3JMGX	Retatrutide	50	Uther	RE50-1128	99.668	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:51.537	\N	\N	mg
64	94411	https://janoshik.com/tests/94411-reta_20mg_RE201210_HS6QQ8IMVXFT	Retatrutide	20	Uther	RE20-1210	\N	\N	\N	2025-12-18	\N	f	f	2026-03-19 22:32:54.047	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:01.699	\N	\N	mg
65	92872	https://janoshik.com/tests/92872-Na_selank_50mg_NASK501130_37WF8D96K8BG	NA-Selank	50	Uther	NASK50-1130	99.298	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:06.756	\N	\N	mg
67	93805	https://janoshik.com/tests/93805-motsc_40mg_MO401207_UGB8BQQ7WNXS	MOTS-C	40	Uther	M040-1207	99.438	\N	\N	2025-12-17	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:16.587	\N	\N	mg
68	93806	https://janoshik.com/tests/93806-tesa_10mg_TE101207_AMA8L4JR73GQ	Tesamorelin	10	Uther	TE10-1207	99.566	\N	\N	2025-12-17	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:21.663	\N	\N	mg
69	93802	https://janoshik.com/tests/93802-SS31_50mg_SS501206_WZR3VR8UKA49	SS-31	50	Uther	SS50-1206	99.853	\N	\N	2025-12-17	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:26.777	\N	\N	mg
72	94407	https://janoshik.com/tests/94407-tir10mg_ZE101209_6NM6U5GZQ2BU	Tirzepatide	10	Uther	ZE10-1209	99.861	\N	\N	19 DEC 2025	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:42.079	\N	\N	mg
73	94404	https://janoshik.com/tests/94404-Thymogen_20mg_THYGEN201208_PIK565ZKV8SK	Thymogen	20	Uther	THYGEN20-1208	99.012	\N	\N	2025-12-19	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:47.128	\N	\N	mg
75	94405	https://janoshik.com/tests/94405-Cartalax_20mg_CARTA201208_2XP894CSVWA9	Cartalax	20	Uther	CARTA20-1208	99.42	\N	\N	2025-12-19	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:57.273	\N	\N	mg
76	94403	https://janoshik.com/tests/94403-tb500_20mg_TB201208_X4F7SBQVJ9SS	TB-500	20	Uther	TB20-1208	99.807	\N	\N	2025-12-22	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:02.44	\N	\N	mg
80	94412	https://janoshik.com/tests/94412-reta_20mg_RE201210_WY65VIA2SLC5	Retatrutide	20	Uther	RE20-1210	\N	3.256	\N	2025-12-22	\N	f	f	2026-03-19 22:32:54.047	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:22.918	\N	\N	mg
81	94406	https://janoshik.com/tests/94406-Abaloparatide_3mg_ABALO31208_121IG7E2YRLA	Abaloparatide	3	Uther	ABALO3-1208	99.554	\N	\N	2025-12-22	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:27.916	\N	\N	mg
84	95674	https://janoshik.com/tests/95674-reta40mg_RE401214_HU4V8BBKMKFJ	Retatrutide	40	Uther	RE40-1214	99.888	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:42.742	\N	\N	mg
85	95666	https://janoshik.com/tests/95666-ara_290_16mg_ARA161212_ZJ6BI6UQSUJU	ARA-290	16	Uther	ARA16-1212	99.515	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:47.686	\N	\N	mg
87	95673	https://janoshik.com/tests/95673-Ghkcu_50mg_HK501213_HNE7SS23LFD1	GHK-Cu	50	Uther	HK50-1213	99.676	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:58.028	\N	\N	mg
88	95676	https://janoshik.com/tests/95676-motsc_10mg_MO101214_HMEPRTNQ8L45	MOTS-C	10	Uther	M010-1214	99.591	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:03.142	\N	\N	mg
92	95854	https://janoshik.com/tests/95854-176191_5mg_17651216_D157HHEW8QMT	Frag 176-191	5	Uther	1765-1216	99.356	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:23.584	\N	\N	mg
93	95856	https://janoshik.com/tests/95856-bpc10mg_4006_BP101215_2JCS3G8VMR3U	BPC-157	10	Uther	BP10-1215	99.679	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:29.036	\N	\N	mg
95	95860	https://verify.janoshik.com/tests/95860-ipa_10mg_IPA101216_F6LIKCUDKJ2R	Ipamorelin	10	Uther	IPA10-1216	99.656	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:38.893	\N	\N	mg
96	95863	https://janoshik.com/tests/95863-kiss_10mg_KIS101216_8F2JVE7V4EF4	Kisspeptin-10	10	Uther	KIS10-1216	99.5	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:44.076	\N	\N	mg
97	95864	https://janoshik.com/tests/95864-kpv_30mg_KP301216_7PYJKRSJIKT1	KPV	30	Uther	KP30-1216	99.81	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:49.133	\N	\N	mg
100	96275	https://verify.janoshik.com/tests/96275-reta_20mg_RE201210_AHGBLNHSWIXD	Retatrutide	20	Uther	RE20-1210	99.817	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:03.734	\N	\N	mg
101	95677	https://janoshik.com/tests/95677-ta1_10mg_TA1101214_L47NV69ZZSLU	TA-1	10	Uther	TA110-1214	99.646	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:08.741	\N	\N	mg
103	95866	https://janoshik.com/tests/95866-tir60mg_ZE601217_K41SB3KZ8J38	Tirzepatide	60	Uther	ZE60-1217	99.862	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:19.115	\N	\N	mg
104	96663	https://janoshik.com/tests/96663-reta10mg_RE101218_LB9YREGTRJF4	Retatrutide	10	Uther	RE10-1218	99.679	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:24.102	\N	\N	mg
105	96668	https://janoshik.com/tests/96668-51q_10mg_51Q101218_Z7JAGRLIPC8K	51Q	10	Uther	51Q10-1218	\N	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	\N	other	\N	\N	\N	\N	\N	t	2026-04-11 22:34:29.267	\N	\N	mg
107	96643	https://janoshik.com/tests/96643-Pt141_10mg_Pt101220_GDWSNJUY34LE	PT-141	10	Uther	Pt10-1220	99.714	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:38.951	\N	\N	mg
71	93807	https://janoshik.com/tests/93807-nad500_NA5001207_YEGKTNZ4G9AL	NAD+ 500	500.71	Uther	NA500-1207	\N	\N	\N	2025-12-16	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:19:42.582	\N	\N	mg
77	94408	https://janoshik.com/tests/94408-Tbfbp_1010_TFB10101209_D87HVRN56PED	TB4 + BPC-157 + Frag	\N	Uther	TF/B1010-1209	\N	\N	\N	2025-12-22	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:47.914	\N	\N	mg
79	94410	https://janoshik.com/tests/94410-tbbp_1010_TB10101209_BT35G2KRUYPG	TB4 + BPC-157	\N	Uther	T/B1010-1209	\N	\N	\N	2025-12-22	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:53.687	\N	\N	mg
82	94415	https://janoshik.com/tests/94415-nad500_NA5001210_1ZGGS3KLDM5Y	NAD+ 500	552.56	Uther	NA500-1210	\N	\N	\N	2025-12-19	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:19:59.558	\N	\N	mg
89	95679	https://janoshik.com/tests/95679-nad500_NA5001214_MHQCYU67K6PJ	NAD+ 500	523.77	Uther	NA500-1214	\N	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:20:04.846	\N	\N	mg
90	95672	https://janoshik.com/tests/95672-klow_KLO801213_BREGYM7XFL9G	K-Low	\N	Uther	KL080-1213	\N	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:20:10.84	\N	\N	mg
108	96656	https://janoshik.com/tests/96656-tesa_20mg_TE201221_MD1KUHJEBAWJ	Tesamorelin	20	Uther	TE20-1221	99.747	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:43.807	\N	\N	mg
109	96657	https://janoshik.com/tests/96657-kpv_10mg_KP101221_VWAGWNVGLQE5	KPV	10	Uther	KP10-1221	99.837	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:48.789	\N	\N	mg
111	96673	https://janoshik.com/tests/96673-tesa_10mg_TE101219_5VPW3INZNIZ5	Tesamorelin	10	Uther	TE10-1219	99.648	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:59.181	\N	\N	mg
112	96675	https://janoshik.com/tests/96675-Na_Epi_20mg_NAEP201219_59Y12P962A8P	NA-Epitalon	20	Uther	NAEP20-1219	99.253	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:04.326	\N	\N	mg
114	95669	https://janoshik.com/tests/95669-tb500_10mg_TB4101213_FXPDI6F9DEWA	TB-500	10	Uther	TB410-1213	\N	\N	\N	2025-12-30	\N	f	f	2026-03-19 22:32:54.055	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:14.46	\N	\N	mg
116	95869	https://janoshik.com/tests/95869-tir60mg_ZE601217_FWUW3QNG8YXH	Tirzepatide	60	Uther	ZE60-1217	\N	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.055	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:24.828	\N	\N	mg
117	95861	https://janoshik.com/tests/95861-ipa_10mg_7VC5SU82AS58	Ipamorelin	10	Uther	IPA10-1216	\N	1.084	\N	2026-01-05	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:30.097	\N	\N	mg
118	95670	https://janoshik.com/tests/95670-tb500_10mg_TB4101213_GVQWVR7HF4T7	TB-500	10	Uther	TB410-1213	\N	1.546	\N	2026-01-05	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:35.144	\N	\N	mg
120	95868	https://janoshik.com/tests/95868-tir60mg_ZE601217_CUVNLYKZ4SLT	Tirzepatide	60	Uther	ZE60-1217	\N	14.805	\N	2026-01-05	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:45.39	\N	\N	mg
121	93079	https://janoshik.com/tests/93079-snap8_10mg_SN101202_Y4H5VUN1BQE9	SNAP-8	10	Uther	SN10-1202	93.974	\N	\N	2025-12-15	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:50.068	\N	\N	mg
122	96909	https://janoshik.com/tests/96909-tir100mg_ZE1001225_4PZ6U2B96FB1	Tirzepatide	100	Uther	ZE100-1225	99.886	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:55.097	\N	\N	mg
124	97447	https://janoshik.com/tests/97447-motsc_20mg_MO201211_MIVASVV3GGVZ	MOTS-C	20	Uther	M020-1211	99.516	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:36:41.743	\N	\N	mg
125	96910	https://janoshik.com/tests/96910-Motsc_20mg_MO201225_VGKUNJARK3EB	MOTS-C	20	Uther	M020-1225	99.47	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:36:46.476	\N	\N	mg
127	96967	https://janoshik.com/tests/96967-Reta_10mg_RE101226_GZAQ29LLBB7U	Retatrutide	10	Uther	RE10-1226	99.707	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:36:56.338	\N	\N	mg
128	97448	https://janoshik.com/tests/97448-reta_10mg_RE101212_4P6E1UULVR2B	Retatrutide	10	Uther	RE10-1212	99.882	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:01.171	\N	\N	mg
129	96650	https://janoshik.com/tests/96650-Hexarelin_3mg_HEX31220_IUEDGPRDYQ1A	Hexarelin	3	Uther	HEX3-1220	99.458	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:05.868	\N	\N	mg
131	96644	https://janoshik.com/tests/96644-Pt141_10mg_Pt101220_NTU7BKJY6SQT	PT-141	10	Uther	Pt10-1220	\N	2.001	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:15.845	\N	\N	mg
132	96664	https://janoshik.com/tests/96664-reta10mg_RE101218_FHRH9MC7IACS	Retatrutide	10	Uther	RE10-1218	\N	2.595	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:20.854	\N	\N	mg
133	96961	https://janoshik.com/tests/96961-Epi_10mg_EP101225_BF1FXCLJC8JP	Epitalon	10	Uther	EP10-1225	\N	3.214	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	EP10-1225	\N	t	2026-04-11 22:37:25.528	\N	\N	mg
135	95862	https://janoshik.com/tests/95862-ipa_10mg_IPA101216_ASB4IUA6E9GZ	Ipamorelin	10	Uther	IPA10-1216	\N	\N	\N	2026-01-09	\N	f	f	2026-03-19 22:32:54.055	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:35.86	\N	\N	mg
136	97409	https://janoshik.com/tests/97409-Bpc_10mg_BP101227_GZBNAHMAFV2Y	BPC-157	10	Uther	BP10-1227	\N	2.787	\N	2026-01-09	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:40.957	\N	\N	mg
138	96907	https://janoshik.com/tests/96907-Ahkcu_50mg_AHK1225_KNEDC5IWXCD9	AHK-Cu	50	Uther	AHK1225	99.04	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:51.221	\N	\N	mg
140	96708	https://janoshik.com/tests/96708-reta_20mg_RE201222_W7CYGQ6SJ7I4	Retatrutide	20	Uther	RE20-1222	99.465	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:00.981	\N	\N	mg
142	96704	https://janoshik.com/tests/96704-ghk_100mg_HK1001222_5JI1WTWCQL32	GHK	100	Uther	HK100-1222	99.714	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:11.016	\N	\N	mg
143	97412	https://verify.janoshik.com/tests/97412-Reta_10mg_RE101128_VWY7349BGDJH	Retatrutide	10	Uther	RE10-1228	99.579	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:15.965	\N	\N	mg
145	97411	https://verify.janoshik.com/tests/97411-Na_selank_10mg_NASK101228_FJE2RR9Y56GB	NA-Selank	10	Uther	NASK10-1228	99.833	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:25.436	\N	\N	mg
146	96709	https://janoshik.com/tests/96709-ss31_50mg_SS501223_TFPBULUSEXG6	SS-31	50	Uther	SS50-1223	99.764	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:30.132	\N	\N	mg
147	96712	https://janoshik.com/tests/96712-Motsc_10mg_MO101224_VYC37QQXW69M	MOTS-C	10	Uther	M010-1224	99.681	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:35.197	\N	\N	mg
149	97445	https://janoshik.com/tests/97445-Disp_5mg_DS51211_FL5R6UK5EUY9	Disp	5	Uther	DS5-1211	99.729	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:45.267	\N	\N	mg
151	96665	https://janoshik.com/tests/96665-reta10mg_RE101218_WK4FCSWU5BHE	Retatrutide	10	Uther	RE10-1218	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:54.813	\N	\N	mg
153	96722	https://janoshik.com/tests/96722-ss31_50mg_SS501223_VJE2QMR8UA1I	SS-31	50	Uther	SS50-1223	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:04.768	\N	\N	mg
154	96724	https://janoshik.com/tests/96724-Motsc_10mg_MO101224_MUC8R1S9C889	MOTS-C	10	Uther	M010-1224	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:09.667	\N	\N	mg
156	98245	https://janoshik.com/tests/98245-motsc_40mg_MO401229_LJAGVXH539ZZ	MOTS-C	40	Uther	M040-1229	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:19.391	\N	\N	mg
157	96721	https://janoshik.com/tests/96721-ss31_50mg_SS501223_SQX13TWLAXZN	SS-31	50	Uther	SS50-1223	\N	2.452	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:24.761	\N	\N	mg
159	98244	https://janoshik.com/tests/98244-motsc_40mg_MO401229_RN98MHYPQR7L	MOTS-C	40	Uther	M040-1229	\N	0.402	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:34.678	\N	\N	mg
160	98250	https://verify.janoshik.com/tests/98250-Humuanin10_HUM101231_7C6B2YHPJULB	Humanin	\N	Uther	HUM10-1231	99.047	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:39.32	\N	\N	mg
163	98251	https://verify.janoshik.com/tests/98251-vesilute20mg_VESIL201231_N6CB3SCS3AUE	Vesilute20mg	20	Uther	VESIL20-1231	99.797	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:54.325	\N	\N	mg
164	98254	https://verify.janoshik.com/tests/98254-cartalax_20mg_CARTA201231_KGN8LAWBL1SA	Cartalax	20	Uther	CARTA20-1231	99.847	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:59.173	\N	\N	mg
165	98258	https://verify.janoshik.com/tests/98258-disp_10mg_DS101231_JEAQ874VP9FI	Disp	10	Uther	DS10-1231	99.612	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:04.027	\N	\N	mg
169	98241	https://verify.janoshik.com/tests/98241-reta20mg_RE201229_PUQJ9UQD7AMK	Retatrutide	20	Uther	RE20-1229	99.788	\N	\N	2026-01-13	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:24.776	\N	\N	mg
171	98259	https://verify.janoshik.com/tests/98259-tir45_mg_ZE450101_1S9ZILT5C2KF	Tirzepatide	\N	Uther	ZE45-0101	99.913	\N	\N	2026-01-13	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:34.228	\N	\N	mg
172	99271	https://verify.janoshik.com/tests/99271-Pe2228_10mg_PE100102_P5V9B4X68UWF	PE-2228	10	Uther	PE10-0102	99.811	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:39.424	\N	\N	mg
173	99272	https://verify.janoshik.com/tests/99272-igf1_1mg_IG10102_AVSZ75NSCXFT	IGF-1	1	Uther	IG1-0102	98.587	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:44.156	\N	\N	mg
175	99275	https://verify.janoshik.com/tests/99275-Tb_farg_10mg_TBF100104_PP2978F3SERE	TB4 + Frag 176-191	10	Uther	TBF10-0104	99.799	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:54.179	\N	\N	mg
176	99277	https://verify.janoshik.com/tests/99277-Semorelin_5mg_SR50104_2U5CIHZTPD16	Sermorelin	5	Uther	SR5-0104	99.411	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:58.848	\N	\N	mg
179	99246	https://verify.janoshik.com/tests/99246-pnc27_30mg_PN300105_J1URBRJA22HL	PNC-27	30	Uther	PN30-0105	99.591	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:13.821	\N	\N	mg
180	99245	https://verify.janoshik.com/tests/99245-bpc20mg_BP200105_J6P73F3H59GE	BPC-157	20	Uther	BP20-0105	99.754	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:18.498	\N	\N	mg
181	99248	https://verify.janoshik.com/tests/99248-cag_5mg_CAG50105_X2QUUVJK7FEX	CAG	5	Uther	CAG5-0105	99.446	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:23.123	\N	\N	mg
183	99260	https://verify.janoshik.com/tests/99260-kiss_10mg_KIS100107_3IZJNMT5HKLX	Kisspeptin-10	10	Uther	KIS10-0107	99.51	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:32.676	\N	\N	mg
184	99263	https://verify.janoshik.com/tests/99263-ghkcu_50mg_HK500107_RL4AATZ6BF1D	GHK-Cu	50	Uther	HK50-0107	99.693	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:37.798	\N	\N	mg
185	99564	https://verify.janoshik.com/tests/99564-Hgh_H100106_MCXAIYJTWSFU	HGH	\N	Uther	H10-0106	95.998	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:42.749	\N	\N	mg
187	97444	https://janoshik.com/tests/97444-tir_30mg_ZE301211_VWP8NXGCPI4N	Tirzepatide	30	Uther	ZE30-1211	99.864	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:52.698	\N	\N	mg
188	99257	https://verify.janoshik.com/tests/99257-reta20mg_RE200107_G2EHN44A2BW8	Retatrutide	20	Uther	RE20-0107	99.035	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:57.677	\N	\N	mg
190	99570	https://verify.janoshik.com/tests/99570-ghk_100mg_HK1000108_FTVAPVSDK7RB	GHK	100	Uther	HK100-0108	99.836	\N	\N	2026-01-20	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:07.813	\N	\N	mg
191	99269	https://verify.janoshik.com/tests/99269-reta30mg_RE300102_9769X3CIVFUJ	Retatrutide	30	Uther	RE30-0102	99.713	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:12.984	\N	\N	mg
192	99571	https://verify.janoshik.com/tests/99571-tesa_10mg_TE100108_MU2PDWXG1CU5	Tesamorelin	10	Uther	TE10-0108	99.704	\N	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:17.893	\N	\N	mg
194	99569	https://verify.janoshik.com/tests/99569-Reta_10mg_RE100108_FTQJVTSFZJ4X	Retatrutide	10	Uther	RE10-0108	99.557	\N	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:27.412	\N	\N	mg
195	101333	https://verify.janoshik.com/tests/101333-semaglutide_5mg_OZ50112_6N74JUT21X7H	Semaglutide	5	Uther	OZ5-0112	99.247	\N	\N	2026-01-22	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:32.361	\N	\N	mg
198	101340	https://verify.janoshik.com/tests/101340-bpc10mg_BP100114_V8VNGNCLWPXU	BPC-157	10	Uther	BP10-0114	99.667	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:47.5	\N	\N	mg
199	101341	https://verify.janoshik.com/tests/101341-Ta1_10mg_TA1100114_J6JGMNGYPEAX	TA-1	10	Uther	TA110-0114	99.454	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:54.702	\N	\N	mg
202	101405	https://verify.janoshik.com/tests/101405-Reta_50mg_Re500109_7UAKWW9NQVEL	Retatrutide	50	Uther	Re50-0109	99.857	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:09.351	\N	\N	mg
203	101404	https://verify.janoshik.com/tests/101404-reta_15mg_RE150110_I8UK17SEV8DN	Retatrutide	15	Uther	RE15-0110	99.866	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:14.508	\N	\N	mg
204	101403	https://verify.janoshik.com/tests/101403-reta_60mg_RE600110_R37FZJKLWEDS	Retatrutide	60	Uther	RE60-0110	99.731	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:19.275	\N	\N	mg
206	101409	https://verify.janoshik.com/tests/101409-tesa_20mg_TE2001111_AK64G35WC8B9	Tesamorelin	20	Uther	TE20-01111	99.709	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:29.236	\N	\N	mg
207	101410	https://verify.janoshik.com/tests/101410-pinealon_20mg_PIN200111_QGZ1HMIIFP68	Pinealon	20	Uther	PIN20-0111	99.174	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:34.118	\N	\N	mg
208	101779	https://verify.janoshik.com/tests/101779-motsc_40mg_MO400115_QTQPM73397FZ	MOTS-C	40	Uther	M040-0115	99.423	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:39.326	\N	\N	mg
210	101784	https://verify.janoshik.com/tests/101784-motsc_20mg_MO200116_AGJKNGXE5I8F	MOTS-C	20	Uther	M020-0116	99.361	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:49.187	\N	\N	mg
167	98256	https://verify.janoshik.com/tests/98256-klow_KL801231_LUYQXDSYR1B4	K-Low	\N	Uther	KL80-1231	\N	\N	\N	2026-01-13	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:20:51.659	\N	\N	mg
168	98260	https://verify.janoshik.com/tests/98260-tbbp_3030_TB30300101_G8KMACB2A9TP	TB4 + BPC-157	\N	Uther	T/B3030-0101	\N	\N	\N	2026-01-13	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:20:57.498	\N	\N	mg
178	99251	https://verify.janoshik.com/tests/99251-tbbp_55_TB550105_JR5LSVN8VVH7	TB4 + BPC-157	\N	Uther	T/B55-0105	\N	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:02.783	\N	\N	mg
200	101407	https://verify.janoshik.com/tests/101407-glow4096_GLO700110_1FPB9IZ91RNR	Glow	\N	Uther	GLO70-0110	\N	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:09.053	\N	\N	mg
211	101777	https://verify.janoshik.com/tests/101777-reta20mg_RE200115_YWCYRFLFDXX3	Retatrutide	20	Uther	RE20-0115	99.772	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:54.062	\N	\N	mg
213	102833	https://verify.janoshik.com/tests/102833-Tir60mg_ZE600118_4TXAVRDEQ86D	Tirzepatide	60	Uther	ZE60-0118	99.904	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:03.771	\N	\N	mg
215	102832	https://verify.janoshik.com/tests/102832-cardiogen_20mg_CARDI200117_AYRUH2ZEHXCK	Cardiogen	20	Uther	CARDI20-0117	99.438	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:14.123	\N	\N	mg
217	96710	https://janoshik.com/tests/96710-cjcipa_55mg_CI551223_N2EDYBAFN3GL	CJC + Ipamorelin	55	Uther	C/155-1223	\N	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.19	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:24.536	\N	\N	mg
218	99250	https://janoshik.com/tests/99250-cag_5mg_CAG50105_FGER99WJNIF5	CAG	5	Uther	CAG5-0105	\N	0.326	\N	2026-01-15	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	other	\N	\N	\N	\N	\N	t	2026-04-11 22:44:29.466	\N	\N	mg
219	99258	https://janoshik.com/tests/99258-reta20mg_RE200107_5TB6FFA39ACA	Retatrutide	20	Uther	RE20-0107	\N	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.19	Janoshik	heavy_metals	other	\N	\N	\N	\N	\N	t	2026-04-11 22:44:34.376	\N	\N	mg
221	99573	https://janoshik.com/tests/99573-tb500_10mg_TB4100109_WQEJV1689BDT	TB-500	10	Uther	TB410-0109	\N	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.19	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:44.533	\N	\N	mg
222	99255	https://janoshik.com/tests/99255-ipa_10mg_IP100106_HHBK5UMRWB2I	Ipamorelin	10	Uther	IP10-0106	\N	0.941	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	other	\N	\N	\N	\N	\N	t	2026-04-11 22:44:49.294	\N	\N	mg
224	99262	https://janoshik.com/tests/99262-kiss_10mg_KIS100107_T74H9C13NFMZ	Kisspeptin-10	10	Uther	KIS10-0107	\N	0.814	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:59.649	\N	\N	mg
225	99265	https://janoshik.com/tests/99265-ghkcu_50mg_HK500107_37MV47H5WAN5	GHK-Cu	50	Uther	HK50-0107	\N	0.862	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:04.422	\N	\N	mg
226	99574	https://janoshik.com/tests/99574-tb500_10mg_TB4100109_HV23EVT74QIL	TB-500	10	Uther	TB410-0109	\N	3.469	\N	2026-01-20	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:09.485	\N	\N	mg
228	96964	https://janoshik.com/tests/96964-Epi_10mg_EP101225_VRGHJRPEEW1D	Epitalon	10	Uther	EP10-1225	\N	\N	t	2026-01-20	\N	f	f	2026-03-19 22:32:54.19	Janoshik	sterility	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:19.904	\N	\N	mg
229	96970	https://janoshik.com/tests/96970-Reta_10mg_RE101226_8TYLUKDWXSV9	Retatrutide	10	Uther	RE10-1226	\N	\N	t	2026-01-20	\N	f	f	2026-03-19 22:32:54.19	Janoshik	sterility	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:24.986	\N	\N	mg
230	96725	https://janoshik.com/tests/96725-Motsc_10mg_MO101224_VWTB72JLFVKL	MOTS-C	10	Uther	M010-1224	\N	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.19	Janoshik	\N	\N	\N	\N	\N	\N	\N	t	2026-04-11 22:45:30.191	\N	\N	mg
232	101337	https://verify.janoshik.com/tests/101337-reta10mg_RE100113_19Y9HVNIM6PZ	Retatrutide	10	Uther	RE10-0113	99.733	\N	\N	2026-01-22	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:39.928	\N	\N	mg
233	102842	https://verify.janoshik.com/tests/102842-ss31_50mg_SS500118_QKYJ6XVCD2CQ	SS-31	50	Uther	SS50-0118	99.73	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:44.735	\N	\N	mg
234	102829	https://verify.janoshik.com/tests/102829-176191_5mg_17650116_TLHYRJL6VSGR	Frag 176-191	5	Uther	1765-0116	99.825	\N	\N	29 JAN 2026	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:49.478	\N	\N	mg
237	103586	https://verify.janoshik.com/tests/103586-reta20mg_RE200121_JFSZ4D61XL39	Retatrutide	20	Uther	RE20-0121	99.712	\N	\N	2026-01-30	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:04.179	\N	\N	mg
240	104935	https://verify.janoshik.com/tests/104935-bpc10mg_BP100126_4IM6WBKWIV2M	BPC-157	10	Uther	BP10-0126	99.705	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:19.559	\N	\N	mg
241	104936	https://verify.janoshik.com/tests/104936-ghk_100mg_HK1000126_D71HZLH8Y7DV	GHK	100	Uther	HK100-0126	99.761	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:24.616	\N	\N	mg
243	104938	https://verify.janoshik.com/tests/104938-mt1_10mg_MT1100127_7T4ZARLMI52C	Melanotan 1	10	Uther	MT110-0127	99.926	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:34.462	\N	\N	mg
246	104942	https://verify.janoshik.com/tests/104942-tesa_10mg_TE100128_XE1UA9YM8YII	Tesamorelin	10	Uther	TE10-0128	99.913	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:48.853	\N	\N	mg
247	104943	https://verify.janoshik.com/tests/104943-epi_10mg_EP100128_MJZM99TJZAH2	Epitalon	10	Uther	EP10-0128	99.77	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:53.448	\N	\N	mg
248	105245	https://verify.janoshik.com/tests/105245-51q_50mg_51Q500125_FN575IH6PHWX	51Q	50	Uther	51Q50-0125	\N	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	\N	other	\N	\N	\N	\N	\N	t	2026-04-11 22:46:58.434	\N	\N	mg
250	105223	https://verify.janoshik.com/tests/105223-Tir30mg_ZE300122_ZRMI5SDDFPQD	Tirzepatide	30	Uther	ZE30-0122	99.8	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:08.249	\N	\N	mg
251	105235	https://verify.janoshik.com/tests/105235-reta10mg_RE100124_J6UN1W5YJP3M	Retatrutide	10	Uther	RE10-0124	99.413	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:12.791	\N	\N	mg
254	105227	https://verify.janoshik.com/tests/105227-tesa_10mg_TE100121_7TVJ2SG7DFBG	Tesamorelin	10	Uther	TE10-0121	99.779	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:27.601	\N	\N	mg
255	105231	https://verify.janoshik.com/tests/105231-cag_10mg_CAG100122_87J3QTIUU7KQ	CAG	10	Uther	CAG10-0122	99.939	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:32.679	\N	\N	mg
257	105233	https://verify.janoshik.com/tests/105233-pt_10mg_PT100122_ZHLADDB1CFDP	PT-141	10	Uther	PT10-0122	99.864	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:42.261	\N	\N	mg
259	105240	https://verify.janoshik.com/tests/105240-tb500_10mg_TB4100124_Q8KS2LCSNAPG	TB-500	10	Uther	TB410-0124	99.611	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:52.009	\N	\N	mg
261	105243	https://verify.janoshik.com/tests/105243-ghk_50mgkpv20mg_CUKP50200125_CSAP1BTYE625	GHK + KPV	50	Uther	CUKP5020-0125	\N	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	\N	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:01.599	\N	\N	mg
236	101778	https://verify.janoshik.com/tests/101778-nad500_NA5000115_XM94DTKU7QEV	NAD+ 500	572.56	Uther	NA500-0115	\N	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:21:25.651	\N	\N	mg
238	97406	https://verify.janoshik.com/tests/97406-tesaipa_55_T_I551227_XUCECDV6TPBM	Tesamorelin + Ipamorelin	\N	Uther	T/155-1227	\N	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:31.36	\N	\N	mg
253	105225	https://verify.janoshik.com/tests/105225-cjcipa_55_CI550122_A7U1GZSL1HA7	CJC + Ipamorelin	\N	Uther	C/155-0122	\N	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:36.978	\N	\N	mg
258	105238	https://verify.janoshik.com/tests/105238-tbbp_1010_tb10100124_SPY39B4VIQ1C	TB4 + BPC-157	\N	Uther	t/b1010-0124	\N	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:48.822	\N	\N	mg
263	101335	https://verify.janoshik.com/tests/101335-Reta_30mg_RE300115_DB66HVNTX25Y	Retatrutide	30	Uther	RE30-0115	99.806	\N	\N	2026-01-22	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:11.485	\N	\N	mg
264	101334	https://verify.janoshik.com/tests/101334-chonluten20mg_CHON200115_JMLTY72VGKA2	Chonluten20mg	20	Uther	CHON20-0115	99.575	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:16.389	\N	\N	mg
266	101344	https://verify.janoshik.com/tests/101344-Kpv_30mg_KP300114_RXVGGW2LH6C4	KPV	30	Uther	KP30-0114	\N	\N	\N	30 JAN 2026	\N	f	f	2026-03-19 22:32:54.199	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:26.263	\N	\N	mg
267	103573	https://verify.janoshik.com/tests/103573-Bpc10mg_BP100119_FC7TRVP77RVH	BPC-157	10	Uther	BP10-0119	99.846	\N	\N	2026-01-30	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:30.767	\N	\N	mg
269	103575	https://verify.janoshik.com/tests/103575-Bpc10mg_BP100119_UCM3M1AE4I2G	BPC-157	10	Uther	BP10-0119	\N	8.159	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:40.989	\N	\N	mg
270	103576	https://verify.janoshik.com/tests/103576-ghk_100mg_HK1000119_TKF9JQ5N4A6C	GHK	100	Uther	HK100-0119	99.69	\N	\N	2026-01-30	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:46.045	\N	\N	mg
272	103578	https://verify.janoshik.com/tests/103578-ghk_100mg_HK1000119_LGN97FT3UJEN	GHK	100	Uther	HK100-0119	\N	0.01	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:55.664	\N	\N	mg
273	103579	https://verify.janoshik.com/tests/103579-fox04_10mg_FOX100119_EC8ZAHC7IP21	FOXO4-DRI	10	Uther	FOX10-0119	99.785	\N	\N	2026-01-30	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:00.351	\N	\N	mg
274	103580	https://verify.janoshik.com/tests/103580-ghkcu_50mg_HK500120_3B726IE9U39Y	GHK-Cu	50	Uther	HK50-0120	99.737	\N	\N	2026-01-30	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:05.418	\N	\N	mg
276	103582	https://verify.janoshik.com/tests/103582-ghkcu_50mg_HK500120_9XH8JIBWQ625	GHK-Cu	50	Uther	HK50-0120	\N	0.234	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:14.779	\N	\N	mg
277	103583	https://verify.janoshik.com/tests/103583-kpv_10mg_KP100120_XDJ72KULCPF4	KPV	10	Uther	KP10-0120	99.916	\N	\N	2026-01-30	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:19.802	\N	\N	mg
278	103585	https://verify.janoshik.com/tests/103585-kpv_10mg_KP100120_9NWUH3EVRDDX	KPV	10	Uther	KP10-0120	\N	0.211	\N	2026-02-03	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:24.522	\N	\N	mg
280	103588	https://verify.janoshik.com/tests/103588-reta20mg_RE200121_LALTTM34Z8YZ	Retatrutide	20	Uther	RE20-0121	\N	0.39	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	other	\N	\N	\N	\N	\N	t	2026-04-11 22:49:34.419	\N	\N	mg
281	105829	https://verify.janoshik.com/tests/105829-reta_10mg_RE100130_L1Z31MIZLB81	Retatrutide	10	Uther	RE10-0130	99.77	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:39.107	\N	\N	mg
282	105831	https://verify.janoshik.com/tests/105831-p21_10mg_P100130_XZX4T3TSWWJL	P21	10	Uther	P10-0130	99.437	\N	\N	2026-02-11	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:43.82	\N	\N	mg
283	105224	https://janoshik.com/tests/105224-Tir30mg_ZE300122_KLB3W7PHH2D4	Tirzepatide	30	Uther	ZE30-0122	\N	2.97	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:49.469	\N	\N	mg
285	105228	https://janoshik.com/tests/105228-tesa_10mg_TE100121_5FN5SC3ECC95	Tesamorelin	10	Uther	TE10-0121	\N	1.108	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	TE10-0121	\N	t	2026-04-11 22:49:59.213	\N	\N	mg
286	105234	https://janoshik.com/tests/105234-oxy_10mg_OXY100122_KRU5AS3YC459	Oxytocin	10	Uther	OXY10-0122	99.205	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:04.264	\N	\N	mg
288	105239	https://janoshik.com/tests/105239-tbbp_1010_tb10100124_4RHQ6WJ8UKE3	TB4 + BPC-157	\N	Uther	t/b1010-0124	\N	4.824	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	t/b1010-0124	\N	t	2026-04-11 22:50:13.794	\N	\N	mg
289	105244	https://janoshik.com/tests/105244-ghk_50mgkpv20mg_CUKP50200125_6NQME5VLBTGW	GHK + KPV	50	Uther	CUKP5020-0125	\N	1.367	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	CUKP5020-0125	\N	t	2026-04-11 22:50:18.715	\N	\N	mg
291	107267	https://verify.janoshik.com/tests/107267-ghkcu_50mg_HK500203_KX8VWUVNYTPT	GHK-Cu	50	Uther	HK50-0203	99.7	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:27.884	\N	\N	mg
294	107270	https://verify.janoshik.com/tests/107270-motsc_10mg_MO100204_3AMGUZ35CV73	MOTS-C	10	Uther	M010-0204	99.659	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:42.837	\N	\N	mg
295	107264	https://verify.janoshik.com/tests/107264-reta10mg_RE100202_PLXK98Z1SM6R	Retatrutide	10	Uther	RE10-0202	99.7	\N	\N	2026-02-13	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:48.016	\N	\N	mg
296	107265	https://verify.janoshik.com/tests/107265-ara_290_16mg_ARA160202_HKSLYGZBJKK6	ARA-290	16	Uther	ARA16-0202	86.222	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:53.016	\N	\N	mg
298	106891	https://verify.janoshik.com/tests/106891-Retatrutide_3T4VL65K5SHM	Retatrutide	\N	Uther	RE20-0115	99.54275	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:03.313	\N	\N	mg
300	106892	https://verify.janoshik.com/tests/106892-Retatrutide_TPDL14K4KB9I	Retatrutide	\N	Uther	RE20-0115	\N	2.805	\N	2026-02-12	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:13.347	\N	\N	mg
302	105447	https://verify.janoshik.com/tests/105447-TB4_ERPXBMHZ5JYX	TB-500	\N	Uther	TB410-0124	99.713	\N	\N	2026-02-19	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:23.241	\N	\N	mg
303	105450	https://verify.janoshik.com/tests/105450-KPV_GM1H72MATPSM	KPV	\N	Uther	KP10-0120	99.842	\N	\N	2026-02-19	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:28.048	\N	\N	mg
305	105823	https://janoshik.com/tests/105823-tir10mg_ZE100128_LTRXCFEBXY9B	Tirzepatide	10	Uther	ZE10-0128	99.691	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:38.209	\N	\N	mg
306	105824	https://janoshik.com/tests/105824-ipa_10mg_IP100129_MAI8LXM3QL3S	Ipamorelin	10	Uther	IP10-0129	99.65	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:43.025	\N	\N	mg
308	105826	https://janoshik.com/tests/105826-bpc_20mg_BP200129_R6JHHDAVSUZW	BPC-157	20	Uther	BP20-0129	99.601	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:53.363	\N	\N	mg
309	105827	https://janoshik.com/tests/105827-reta40mg_RE400130_MI4LPJBR7D2J	Retatrutide	40	Uther	RE40-0130	99.827	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:58.2	\N	\N	mg
310	105828	https://janoshik.com/tests/105828-tir15mg_ZE150130_93L7FD7851QT	Tir15mg	15	Uther	ZE15-0130	99.796	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:02.91	\N	\N	mg
312	107772	https://janoshik.com/tests/107772-51q_10mg_51Q100201_GYG9SFQR6KSE	51Q	10	Uther	51Q10-0201	\N	\N	\N	2026-02-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	\N	other	\N	\N	\N	\N	\N	t	2026-04-11 22:52:13.053	\N	\N	mg
299	106896	https://verify.janoshik.com/tests/106896-Retatrutide_PIHCN3TMNCPJ	Retatrutide	\N	Uther	RE20-0115	\N	\N	\N	2026-02-12	\N	f	f	2026-03-19 22:32:54.199	Janoshik	\N	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:01.613	\N	\N	mg
313	107769	https://janoshik.com/tests/107769-ta1_10mg_TA1100201_M4P1LM988LDZ	TA-1	10	Uther	TA110-0201	99.93	\N	\N	2026-02-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:18.067	\N	\N	mg
314	107764	https://janoshik.com/tests/107764-cartalax_20mg_CARTA200131_24B6BNEW5W3A	Cartalax	20	Uther	CARTA20-0131	99.753	\N	\N	2026-02-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:23.003	\N	\N	mg
316	109551	https://janoshik.com/tests/109551-reta30_RE300205_AKPPKJ4CBN9Z	Retatrutide	\N	Uther	RE30-0205	99.829	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:33.015	\N	\N	mg
317	109552	https://janoshik.com/tests/109552-tir60mg_ZE600204_22JEDZ3H92PM	Tirzepatide	60	Uther	ZE60-0204	99.92	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:38.383	\N	\N	mg
318	109558	https://janoshik.com/tests/109558-tir60mg_ZE600207_2TLDUCWKPQMC	Tirzepatide	60	Uther	ZE60-0207	99.862	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:43.261	\N	\N	mg
320	109553	https://janoshik.com/tests/109553-motsc_40mg_MO400205_3DC3E6GNW8IA	MOTS-C	40	Uther	M040-0205	99.135	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:53.071	\N	\N	mg
321	109554	https://janoshik.com/tests/109554-ghk_100mg_HK1000205_4RMM1VAVCBSJ	GHK	100	Uther	HK100-0205	99.8	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:58.026	\N	\N	mg
324	109557	https://janoshik.com/tests/109557-Pancargen_PAN0206_RP4NGVBW57E8	Pancargen	\N	Uther	PAN-0206	99.426	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:13.232	\N	\N	mg
325	109573	https://janoshik.com/tests/109573-na_semax_10mg_NASX100207_LPU89E8I9YFF	NA-Semax	10	Uther	NASX10-0207	99.809	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:17.956	\N	\N	mg
328	109577	https://janoshik.com/tests/109577-tesa_10mg_TE100208_QQISCLKUHWSW	Tesamorelin	10	Uther	TE10-0208	99.575	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:32.175	\N	\N	mg
330	107766	https://janoshik.com/tests/107766-reta20mg_RE200131_QDN5AQIF6D63	Retatrutide	20	Uther	RE20-0131	99.831	\N	\N	2026-02-24	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:41.886	\N	\N	mg
332	114454	https://janoshik.com/tests/114454-51q_50mg_51Q500209_BWPH6ZCYVM6Z	51Q	50	Uther	51Q50-0209	\N	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	\N	\N	\N	\N	\N	\N	\N	t	2026-04-11 22:53:51.939	\N	\N	mg
333	114452	https://janoshik.com/tests/114452-ghrp2_10mg_2019_G2100209_EDS76D9311NW	GHRP-2	10	Uther	G210-0209	99.664	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:56.856	\N	\N	mg
334	114461	https://janoshik.com/tests/114461-Motsc_20mg_MO200210_J8G8NRWNRZKE	MOTS-C	20	Uther	M020-0210	99.257	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:01.715	\N	\N	mg
336	114469	https://janoshik.com/tests/114469-snap_10mg_SN100226_YW8JPIIK5MEN	SNAP-8	10	Uther	SN10-0226	94.256	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:11.679	\N	\N	mg
341	114465	https://janoshik.com/tests/114465-tir30mg_ZE300226_6SS6ZFSWCG1E	Tirzepatide	30	Uther	ZE30-0226	99.818	\N	\N	2026-03-13	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:35.836	\N	\N	mg
1	91806	https://janoshik.com/tests/91806-ghk_100mg_HK1001125_KTLJ2S1KCZ7Y	GHK	100	Uther	HK100-1125	99.723	\N	\N	2025-12-08	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:07:11.277	\N	\N	mg
3	91820	https://janoshik.com/tests/91820-Livagen_20mg_LIV201126_MJTERTJ7IKZ2	Livagen	20	Uther	LIV20-1126	99.485	\N	\N	2025-12-08	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:10:30.028	\N	\N	mg
6	92157	https://janoshik.com/tests/92157-motsc_20mg_MO201127_LLTGHRRR22HW	MOTS-C	20	Uther	M020-1127	99.506	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:04.678	\N	\N	mg
10	92176	https://janoshik.com/tests/92176-ipa_10mg_IP101112_BDNXMZTPPMLN	Ipamorelin	10	Uther	IP10-1112	99.572	\N	\N	2025-12-09	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:24.569	\N	\N	mg
14	91803	https://janoshik.com/tests/91803-Bpc_10mg_BP101124_Q86HV84BFYL3	BPC-157	10	Uther	BP10-1124	99.793	\N	\N	2025-12-08	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:26:45.331	\N	\N	mg
18	92840	https://janoshik.com/tests/92840-PT141_10mg_PT101128_R9EG3IEJLVF5	Pt141	10	Uther	PT10-1128	99.727	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:05.557	\N	\N	mg
22	92863	https://janoshik.com/tests/92863-cjcipa_55mg_CI551130_TIQ1NU68H4GH	CJC + Ipamorelin	55	Uther	C/155-1130	\N	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:25.89	\N	\N	mg
26	92855	https://janoshik.com/tests/92855-kpv_10mg_KP101129_PLSK1D8LUTKZ	KPV	10	Uther	KP10-1129	\N	0.926	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:27:46.416	\N	\N	mg
29	92842	https://janoshik.com/tests/92842-PT141_10mg_PT101128_9UDPXQ3WM64T	Pt141	10	Uther	PT10-1128	\N	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:01.283	\N	\N	mg
31	92860	https://janoshik.com/tests/92860-cjc_no_dac10mg_CJND101129_SJQVXP3CYISJ	CJC-1295 (no DAC)	10	Uther	CJND10-1129	\N	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:11.563	\N	\N	mg
35	92873	https://janoshik.com/tests/92873-Na_selank_50mg_NASK501130_TAQ4XNY2BHYT	NA-Selank	50	Uther	NASK50-1130	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:31.582	\N	\N	mg
37	92865	https://janoshik.com/tests/92865-LL37_5mg_LL51130_7D29U6J5N9HX	LL-37	5	Uther	LL5-1130	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:28:41.065	\N	\N	mg
42	93076	https://janoshik.com/tests/93076-Semax_10mg_SX101204_3AJWDJLYNZUK	Semax	10	Uther	SX10-1204	99.13	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:06.981	\N	\N	mg
46	93195	https://janoshik.com/tests/93195-Tir_60mg_ZE601204_NJGRTH1KIG1P	Tirzepatide	60	Uther	ZE60-1204	99.897	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:26.947	\N	\N	mg
49	93355	https://janoshik.com/tests/93355-LL37_5mg_LL51130_DUX1VMEMHUPI	LL-37	5	Uther	LL5-1130	99.167	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:42.244	\N	\N	mg
327	109576	https://janoshik.com/tests/109576-klow_KLO800208_SCQBJAKJK4KB	K-Low	\N	Uther	KL080-0208	\N	\N	\N	23 FEB 2026	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:12.959	\N	\N	mg
329	107763	https://janoshik.com/tests/107763-bptbf_1010_BPTBF10100131_6UZJFX82JPH4	BPC-157 + TB4 + Frag	\N	Uther	BP/TBF1010-0131	\N	\N	\N	2026-02-24	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:18.608	\N	\N	mg
337	114471	https://janoshik.com/tests/114471-cjcipa_55_CI550227_ZC9DYD2ALMZE	CJC + Ipamorelin	\N	Uther	C/155-0227	\N	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:25.476	\N	\N	mg
338	114453	https://janoshik.com/tests/114453-slu_500mcg3_TSVDSWBZ1XBS	SLU-PP-332	628.71	Uther	Unknown	\N	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:31.59	\N	\N	mg
340	114455	https://janoshik.com/tests/114455-NAD500_NA5000209_XQU9Y6T2LHVB	NAD+ 500	576.91	Uther	NA500-0209	\N	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:22:37.265	\N	\N	mg
50	93080	https://janoshik.com/tests/93080-tesa_20mg_TE201202_HV3GH7CWTN9C	Tesamorelin	20	Uther	TE20-1202	99.663	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:47.265	\N	\N	mg
52	92856	https://janoshik.com/tests/92856-tesa_10mg_TE101129_F7K1JW34SKX2	Tesamorelin	10	Uther	TE10-1129	99.697334	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:29:58.383	\N	\N	mg
56	93081	https://janoshik.com/tests/93081-Brochogen_20mg_BRON201202_5WV2GR4NLNJX	Brochogen	20	Uther	BRON20-1202	99.771	\N	\N	2025-12-15	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:20.552	\N	\N	mg
60	93803	https://janoshik.com/tests/93803-Tir10mg_ZE101207_38TSA7BA91I8	Tir10mg	10	Uther	ZE10-1207	99.674	\N	\N	2025-12-16	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:41.382	\N	\N	mg
63	92854	https://janoshik.com/tests/92854-kpv_10mg_KP101129_KXNFWKYHGW3Y	KPV	10	Uther	KP10-1129	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:54.047	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:30:56.809	\N	\N	mg
66	94373	https://janoshik.com/tests/94373-Na_semax_50mg_NASX501130_IGC2117M2E54	NA-Semax	50	Uther	NASX50-1130	99.179	\N	\N	2025-12-11	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:11.771	\N	\N	mg
70	93801	https://janoshik.com/tests/93801-bpc10mg_BP101206_I6VTA8TXYX1J	BPC-157	10	Uther	BP10-1206	99.507	\N	\N	2025-12-17	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:32.014	\N	\N	mg
74	93197	https://janoshik.com/tests/93197-pinealon_20mg_PIN201204_Z4TTET3AP1GH	Pinealon	20	Uther	PIN20-1204	99.022	\N	\N	2025-12-17	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:31:52.092	\N	\N	mg
78	94409	https://janoshik.com/tests/94409-Tb_farg_10mg_TBF101209_A2X5D3PTKH1Q	TB4 + Frag 176-191	10	Uther	TBF10-1209	99.501	\N	\N	2025-12-22	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:12.93	\N	\N	mg
83	95664	https://janoshik.com/tests/95664-51q_50mg_51Q501212_WFRIDD5B1QGU	51Q	50	Uther	51Q50-1212	\N	\N	\N	2025-12-30	\N	f	f	2026-03-19 22:32:54.047	Janoshik	\N	other	\N	\N	\N	\N	\N	t	2026-04-11 22:32:37.906	\N	\N	mg
86	95667	https://janoshik.com/tests/95667-tb500_10mg_TB4101213_TYLU141XVWK3	TB-500	10	Uther	TB410-1213	99.867	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:32:52.752	\N	\N	mg
94	95859	https://janoshik.com/tests/95859-Selank_10mg_SK101216_GS4FB9AU32KN	Selank	10	Uther	SK10-1216	99.666	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:34.175	\N	\N	mg
344	122181	https://janoshik.com/tests/122181-bpc_10mg_BP100304_JFQA3LK897QC	BPC-157	10	Uther	BP10-0304	99.789	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:50.982	\N	\N	mg
345	122185	https://janoshik.com/tests/122185-Motsc_10mg_MO100305_94Z5WIXEF2YZ	MOTS-C	10	Uther	M010-0305	99.443	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:56.172	\N	\N	mg
347	122190	https://janoshik.com/tests/122190-tb_500_10mg_TB4100308_AW76QJY1RUNH	TB-500	10	Uther	TB410-0308	99.823	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:55:07.164	\N	\N	mg
348	122197	https://janoshik.com/tests/122197-Abalo_3mg_ABALO30306_H33XGUHT5SIT	Abaloparatide	3	Uther	ABAL03-0306	99.746	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:55:12.051	\N	\N	mg
349	122198	https://janoshik.com/tests/122198-Motsc_20mg_MO200307_2VB6HRL6G3BQ	MOTS-C	20	Uther	M020-0307	99.508	\N	\N	18 MAR 2026	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:55:17.116	\N	\N	mg
351	122186	https://janoshik.com/tests/122186-reta10mg_RE100306_GAZ8DWRRSCL6	Retatrutide	10	Uther	RE10-0306	99.733	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.209	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:55:26.865	\N	\N	mg
98	95872	https://janoshik.com/tests/95872-Na_semax_10mg_NASX101217_U3LFSC4IBDT7	NA-Semax	10	Uther	NASX10-1217	99.714	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:54.218	\N	\N	mg
99	95873	https://janoshik.com/tests/95873-Mt2_10mg_MT2101217_KX52H9LIXLGI	Melanotan 2	10	Uther	MT210-1217	99.824	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:33:58.984	\N	\N	mg
106	96642	https://janoshik.com/tests/96642-Hgh_10iu_with_dipolymer_H101218_ETYWQH9HFXBI	HGH	\N	Uther	H10-1218	95.419	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:34.141	\N	\N	mg
110	96671	https://janoshik.com/tests/96671-mt1_10mg_MT1101218_KVWCHK2P3GLS	Melanotan 1	10	Uther	MT1-101218	99.821	\N	\N	2026-01-06	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:34:54.385	\N	\N	mg
113	94413	https://janoshik.com/tests/94413-Epi_50mg_EPI501210_UY6M31CKZD3K	Epitalon	50	Uther	EPI50-1210	99.406	\N	\N	2025-12-19	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:09.369	\N	\N	mg
115	95858	https://janoshik.com/tests/95858-bpc10mg_4006_BP101215_FW7KDSWK7ZJW	BPC-157	10	Uther	BP10-1215	\N	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.055	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:19.638	\N	\N	mg
119	95857	https://janoshik.com/tests/95857-bpc10mg_4006_BP101215_LISJSJ8UW145	BPC-157	10	Uther	BP10-1215	\N	15.69	\N	2026-01-05	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:35:40.303	\N	\N	mg
123	96966	https://janoshik.com/tests/96966-Reta_100mg_RE1001226_41AIYNUJDHSW	Retatrutide	100	Uther	RE100-1226	99.608	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:36:00.604	\N	\N	mg
126	96911	https://janoshik.com/tests/96911-Epi_10mg_EP101225_FNFX2RR5NA8Q	Epitalon	10	Uther	EP10-1225	99.328	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:36:51.067	\N	\N	mg
130	96654	https://janoshik.com/tests/96654-prostamax20mg_PRO201212_2B7YWKZEZS6S	Prostamax20mg	20	Uther	PRO20-1212	99.002	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:10.9	\N	\N	mg
134	96968	https://janoshik.com/tests/96968-Reta_10mg_RE101226_UI4DQ75Y6SHP	Retatrutide	10	Uther	RE10-1226	\N	1.792	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:30.362	\N	\N	mg
137	96906	https://janoshik.com/tests/96906-Ghkcu_50mg_HK1225_U7JAHB2QKT8L	GHK-Cu	50	Uther	HK1225	99.835	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:37:46.003	\N	\N	mg
141	96714	https://janoshik.com/tests/96714-reta30_RE301223_TQAAPIKD316Z	Retatrutide	\N	Uther	RE30-1223	99.854	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:06.095	\N	\N	mg
144	97408	https://verify.janoshik.com/tests/97408-Bpc_10mg_BP101227_L4EX74JP7N3H	BPC-157	10	Uther	BP10-1227	99.739	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:20.445	\N	\N	mg
102	95855	https://janoshik.com/tests/95855-tesaipacjc_633_TIC6331216_R6IGDCRQQ2U2	Tesamorelin + Ipamorelin + CJC	\N	Uther	T/I/C633-1216	\N	\N	\N	2026-01-02	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:20:23.017	\N	\N	mg
148	96702	https://janoshik.com/tests/96702-nad500_NA5001222NA5001224_CZF7RP1ZEGKT	NAD+ 500	557.1	Uther	NA500-1222/NA500-1224	\N	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:20:34.844	\N	\N	mg
352	122188	https://janoshik.com/tests/122188-klow_KLO800308_8BCK6CKASBMV	K-Low	\N	Uther	KL080-0308	\N	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.209	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:48.394	\N	\N	mg
150	96645	https://janoshik.com/tests/96645-Pt141_10mg_Pt101220_G7IJBB9985VK	PT-141	10	Uther	Pt10-1220	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.055	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:50.208	\N	\N	mg
152	96962	https://janoshik.com/tests/96962-Epi_10mg_EP101225_IJPG44JN9X3T	Epitalon	10	Uther	EP10-1225	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:38:59.672	\N	\N	mg
155	97410	https://janoshik.com/tests/97410-Bpc_10mg_BP101227_3W5JQRNBEF74	BPC-157	10	Uther	BP10-1227	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:14.383	\N	\N	mg
158	96723	https://janoshik.com/tests/96723-Motsc_10mg_MO101224_DIBQPMNX8ETU	MOTS-C	10	Uther	M010-1224	\N	0.81	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:29.802	\N	\N	mg
161	98242	https://verify.janoshik.com/tests/98242-motsc_40mg_MO401229_2H4LZLWGLT2T	MOTS-C	40	Uther	M040-1229	99.391	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:39:44.133	\N	\N	mg
170	98247	https://verify.janoshik.com/tests/98247-Tir20mg_ZE201230_P7CKQIER5PCL	Tirzepatide	20	Uther	ZE20-1230	99.835	\N	\N	2026-01-13	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:29.348	\N	\N	mg
174	99273	https://verify.janoshik.com/tests/99273-ss31_10mg_SS100103_QPR1W4435BBY	SS-31	10	Uther	SS10-0103	99.64	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:40:48.885	\N	\N	mg
177	99278	https://verify.janoshik.com/tests/99278-testagen_20mg_TESTA200104_9HU3KN15VCQI	Testagen	20	Uther	TESTA20-0104	99.718	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:04.04	\N	\N	mg
182	99252	https://verify.janoshik.com/tests/99252-ipa_10mg_IP100106_LDWJLKZ7JKFU	Ipamorelin	10	Uther	IP10-0106	99.78	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:27.753	\N	\N	mg
186	99247	https://verify.janoshik.com/tests/99247-tir30mg_ZE300105_KDF5V4HPMG4B	Tirzepatide	30	Uther	ZE30-0105	99.825	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:41:47.448	\N	\N	mg
189	99572	https://verify.janoshik.com/tests/99572-tb500_10mg_TB4100109_KI6M6AJ7VXU8	TB-500	10	Uther	TB410-0109	99.331	\N	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:02.532	\N	\N	mg
193	99575	https://verify.janoshik.com/tests/99575-thymogen_20mg_THYGEN200109_X3QKL7ME2WUS	Thymogen	20	Uther	THYGEN20-0109	98.511	\N	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:22.78	\N	\N	mg
196	101336	https://verify.janoshik.com/tests/101336-Kpv_30mg_KP300115_NTVUB7IXVGCR	KPV	30	Uther	KP30-0115	99.801	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:37.09	\N	\N	mg
197	101339	https://verify.janoshik.com/tests/101339-cjc_no_dac_10mg_CJND100113_63Y9945K7MGN	CJC-1295 (no DAC)	10	Uther	CJND10-0113	99.753	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:42:42.622	\N	\N	mg
201	101408	https://verify.janoshik.com/tests/101408-Tir30mg_ZE300111_3QRVKYEFYMX1	Tirzepatide	30	Uther	ZE30-0111	99.779	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:04.584	\N	\N	mg
205	101406	https://verify.janoshik.com/tests/101406-bpc_10mg_BP100110_Z83YN17TBJ7C	BPC-157	10	Uther	BP10-0110	99.762	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:24.234	\N	\N	mg
209	101780	https://verify.janoshik.com/tests/101780-Epi_50mg_EP500116_HQ3E2YSNQN4R	Epitalon	50	Uther	EP50-0116	99.497	\N	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:44.273	\N	\N	mg
212	102830	https://verify.janoshik.com/tests/102830-reta40mg_RE400117_SE7P3YMJ6KXJ	Retatrutide	40	Uther	RE40-0117	99.919	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:43:58.765	\N	\N	mg
216	102834	https://verify.janoshik.com/tests/102834-motsc_10mg_MO100118_5CIEKH9BN7AT	MOTS-C	10	Uther	M010-0118	99.349	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:18.897	\N	\N	mg
223	99259	https://janoshik.com/tests/99259-reta20mg_RE200107_VG1ZVM7X9F9M	Retatrutide	20	Uther	RE20-0107	\N	1.655	\N	2026-01-19	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:44:54.65	\N	\N	mg
227	96646	https://janoshik.com/tests/96646-Pt141_10mg_Pt101220_PA9CIPKTYD5C	PT-141	10	Uther	Pt10-1220	\N	\N	t	2026-01-20	\N	f	f	2026-03-19 22:32:54.19	Janoshik	sterility	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:45:15.153	\N	\N	mg
231	101343	https://verify.janoshik.com/tests/101343-Kpv_30mg_KP300114_X1HK18DLUVC2	KPV	30	Uther	KP30-0114	\N	1.309	\N	2026-01-26	\N	f	f	2026-03-19 22:32:54.19	Janoshik	endotoxin	peptide	\N	\N	\N	KP30-0114	\N	t	2026-04-11 22:45:35.183	\N	\N	mg
239	97407	https://verify.janoshik.com/tests/97407-Vip_10mg_VIP101227_Y1IH1GPTGTJN	VIP	10	Uther	VIP10-1227	99.784	\N	\N	2026-01-08	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:14.407	\N	\N	mg
242	104937	https://verify.janoshik.com/tests/104937-selank_10mg_SK100126_WPYL58VMFEGN	Selank	10	Uther	SK10-0126	99.801	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:29.678	\N	\N	mg
244	104939	https://verify.janoshik.com/tests/104939-bpc_40mg_BP400127_RZ9YQQDCAJ35	BPC-157	40	Uther	BP40-0127	99.672	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:39.309	\N	\N	mg
245	104941	https://verify.janoshik.com/tests/104941-mt2_10mg_MT2100127_BE6XXSIPHUZ1	Melanotan 2	10	Uther	MT210-0127	99.513	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:46:44.235	\N	\N	mg
249	104933	https://verify.janoshik.com/tests/104933-reta30mg_RE300127_4VSEJMX2C26F	Retatrutide	30	Uther	RE30-0127	99.714	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:03.592	\N	\N	mg
252	105241	https://verify.janoshik.com/tests/105241-tir100mg_ZE1000125_5JY1MPSNPI45	Tirzepatide	100	Uther	ZE100-0125	99.911	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:17.735	\N	\N	mg
260	105242	https://verify.janoshik.com/tests/105242-semax_10mg_SX100125_9DMKBRJNYV47	Semax	10	Uther	SX10-0125	99.566	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:47:56.731	\N	\N	mg
265	101342	https://verify.janoshik.com/tests/101342-Kpv_30mg_KP300114_ZGRLFRWNNCBR	KPV	30	Uther	KP30-0114	99.667	\N	\N	2026-01-23	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:21.436	\N	\N	mg
268	103574	https://verify.janoshik.com/tests/103574-Bpc10mg_BP100119_QAR845Q34JJH	BPC-157	10	Uther	BP10-0119	\N	\N	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:36.107	\N	\N	mg
271	103577	https://verify.janoshik.com/tests/103577-ghk_100mg_HK1000119_KDK452E36S11	GHK	100	Uther	HK100-0119	\N	\N	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:48:51.162	\N	\N	mg
275	103581	https://verify.janoshik.com/tests/103581-ghkcu_50mg_HK500120_SCIC85BAIUJ9	GHK-Cu	50	Uther	HK50-0120	\N	\N	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:10.15	\N	\N	mg
235	101338	https://verify.janoshik.com/tests/101338-nad500_NA5000113_TLKAPXN5TC8Q	NAD+ 500	563.63	Uther	NA500-0113	\N	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:21:20.163	\N	\N	mg
256	105232	https://verify.janoshik.com/tests/105232-cjcipa_1010_CI10100123_TP2Z2L9ZYFHY	CJC + Ipamorelin	12.97	Uther	C/I1010-0123	\N	\N	\N	2026-02-05	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:42.189	\N	\N	mg
279	103587	https://verify.janoshik.com/tests/103587-reta20mg_RE200121_G8NXYYTGX9M3	Retatrutide	20	Uther	RE20-0121	\N	\N	\N	2026-02-02	\N	f	f	2026-03-19 22:32:54.199	Janoshik	heavy_metals	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:49:29.699	\N	\N	mg
284	105226	https://janoshik.com/tests/105226-cjcipa_55_CI550122_V98EA8VHYVPM	CJC + Ipamorelin	\N	Uther	C/155-0122	\N	0.985	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	C/155-0122	\N	t	2026-04-11 22:49:54.462	\N	\N	mg
287	105236	https://janoshik.com/tests/105236-reta10mg_RE100124_ZUABKWFXB5EX	Retatrutide	10	Uther	RE10-0124	\N	0.986	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	endotoxin	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:09.022	\N	\N	mg
290	107266	https://verify.janoshik.com/tests/107266-semo_5mg_SR50202_5U54SA56AFKZ	Sermorelin	5	Uther	SR5-0202	99.344	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:23.409	\N	\N	mg
292	107268	https://verify.janoshik.com/tests/107268-tesa_20mg_TE200203_6I5XNBZY2IA1	Tesamorelin	20	Uther	TE20-0203	99.327	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:33.035	\N	\N	mg
293	107269	https://verify.janoshik.com/tests/107269-SS31_10mg_SS100204_TDMVHZB98755	SS-31	10	Uther	SS10-0204	99.685	\N	\N	2026-02-16	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:38.17	\N	\N	mg
297	98248	https://janoshik.com/tests/98248-ta1_10mg_TA1101230_W3ZE7LLGP9QZ	TA-1	10	Uther	TA110-1230	99.756	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:50:58.207	\N	\N	mg
301	105444	https://verify.janoshik.com/tests/105444-BPC157_25U5NCQCRS88	BPC-157	\N	Uther	BP10-0114	99.8825	\N	\N	2026-02-19	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:18.462	\N	\N	mg
304	105453	https://verify.janoshik.com/tests/105453-GHKCU_MZ6A3RFTNPFT	GHK-Cu	\N	Uther	HK50-0107	99.732	\N	\N	2026-02-19	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:32.778	\N	\N	mg
307	105825	https://janoshik.com/tests/105825-cjc_dac_5mg_CJWD50129_TXU9D2CHULNG	CJC-1295 (with DAC)	5	Uther	CJWD5-0129	99.541	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:51:48.399	\N	\N	mg
311	105830	https://janoshik.com/tests/105830-ss31_30mg_SS300130_SN8PK9Q33YLD	SS-31	30	Uther	SS30-0130	99.668	\N	\N	2026-02-10	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:08.044	\N	\N	mg
315	107768	https://janoshik.com/tests/107768-Aod5mg_AO50201_9HGIH3LBF39R	AOD-9604	5	Uther	A05-0201	99.075	\N	\N	2026-02-20	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:28.043	\N	\N	mg
319	109575	https://janoshik.com/tests/109575-reta30mg_RE300208_KY6L73MLP3E4	Retatrutide	30	Uther	RE30-0208	99.231	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:52:48.136	\N	\N	mg
323	109556	https://janoshik.com/tests/109556-Livagen_20mg_LIV200206_P6824KQC9UW1	Livagen	20	Uther	LIV20-0206	99.721	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:08.415	\N	\N	mg
326	109574	https://janoshik.com/tests/109574-bpc_10mg_BP100207_JMIBIIEAJLXZ	BPC-157	10	Uther	BP10-0207	99.7	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:22.747	\N	\N	mg
331	114451	https://verify.janoshik.com/tests/114451-reta20mg_3970_RE200209_9ZBGGBJ6SCF1	Retatrutide	20	Uther	RE20-0209	99.827	\N	\N	2026-03-13	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:53:46.641	\N	\N	mg
335	114467	https://janoshik.com/tests/114467-tb500_10mg_TB4100226_B3QAR9G8V73P	TB-500	10	Uther	TB410-0226	99.807	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:06.674	\N	\N	mg
339	114459	https://janoshik.com/tests/114459-Adamax_10mg_ADAM100210_MENWY1EMG927	Adamax	10	Uther	ADAM10-0210	99.964	\N	\N	2026-03-16	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:26.381	\N	\N	mg
343	122180	https://janoshik.com/tests/122180-ghkcu_50mg_HK500304_H5QIAJAM1TFM	GHK-Cu	50	Uther	HK50-0304	99.78	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:54:45.756	\N	\N	mg
346	122189	https://janoshik.com/tests/122189-ghk_100mg_HK1000308_WQIM4ERU37M9	GHK	100	Uther	HK100-0308	99.72	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:55:01.225	\N	\N	mg
350	122199	https://janoshik.com/tests/122199-LL37_LL50307_3BEQAWIKKPEV	LL-37	\N	Uther	LL5-0307	99.85	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 22:55:21.957	\N	\N	mg
353	\N	https://janoshik.com/tests/102091-Tirzepatide_10mg_A23TJU9VSYW6	Tirzepatide	\N	Uther	Unknown	99.628	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:03.756436	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:01:03.754	\N	\N	mg
355	\N	https://janoshik.com/tests/102095-Tirzepatide_30mg_JPFDI6IK4RH3	Tirzepatide	\N	Uther	Unknown	99.815	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:13.918912	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:01:13.917	\N	\N	mg
357	\N	https://janoshik.com/tests/102097-Tirzepatide_60mg_C65EJGZI65JP	Tirzepatide	\N	Uther	Unknown	99.8655	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:23.35099	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:01:23.35	\N	\N	mg
359	\N	https://janoshik.com/tests/102100-Retatrutide_30_2HGK9JIARQ3K	Retatrutide	\N	Uther	Unknown	99.872	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:33.346402	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:01:33.345	\N	\N	mg
361	\N	https://janoshik.com/tests/102102-Cagrilintide_5mg_SHAPWSFR5C2M	Cagrilintide	\N	Uther	Unknown	99.6315	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:42.874737	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:01:42.873	\N	\N	mg
363	\N	https://janoshik.com/tests/102408-Survotudide_10mg_HMHW9JC6765E	Survotudide	\N	Uther	Unknown	99.627	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:52.651925	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:01:52.651	\N	\N	mg
365	\N	https://janoshik.com/tests/102416-KPV_30mg_D1PX1S3HR2PL	KPV	\N	Uther	Unknown	99.705	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:02.407133	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:02.406	\N	\N	mg
366	\N	https://janoshik.com/tests/102418-Oxytocin_10mg_KBQLWC37QNII	Oxytocin	\N	Uther	Unknown	93.894	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:06.749316	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:06.748	\N	\N	mg
367	\N	https://janoshik.com/tests/102422-NAsemax_50mg_WGEWR86EB2Y3	N-Acetyl Semax Amidate	\N	Uther	Unknown	99.284	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:11.559896	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:11.559	\N	\N	mg
342	122187	https://janoshik.com/tests/122187-NAD500_NA5000306_17QI8WJ33I5H	NAD+ 500	549.89	Uther	NA500-0306	\N	\N	\N	2026-03-18	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:22:42.914	\N	\N	mg
354	\N	https://janoshik.com/tests/102094-Tirzepatide_10mg_74HCL9WXKCF4	Tirzepatide	10	Uther	Unknown	\N	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:08.820179	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:54.01	\N	\N	mg
358	\N	https://janoshik.com/tests/102099-Tirzepatide_60mg_6CPVW9ASLUTR	Tirzepatide 60mg	60	Uther	Unknown	\N	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:28.469439	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:04.782	\N	\N	mg
360	\N	https://janoshik.com/tests/102101-Retatrutide_30_9LMWS72THP67	Retatrutide 30	\N	Uther	Unknown	\N	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:38.168317	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:12.352	\N	\N	mg
362	\N	https://janoshik.com/tests/102104-Cagrilintide_5mg_R3W97LNKPE1B	Cagrilintide 5mg	5	Uther	Unknown	\N	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:47.849781	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:17.781	\N	\N	mg
364	\N	https://janoshik.com/tests/102409-Survotudide_10mg_K94Z2FXQUQSZ	Survotudide 10mg	10	Uther	Unknown	\N	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:57.460889	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:23.137	\N	\N	mg
368	\N	https://janoshik.com/tests/102425-NASelank_50mg_WSV53GIEYK54	N-Acetyl Selank Amidate	\N	Uther	Unknown	99.448	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:16.101415	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:16.1	\N	\N	mg
371	\N	https://janoshik.com/tests/102435-BPC_10mg_Z8NZEXLBHEGC	BPC-157	\N	Uther	Unknown	99.685	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:30.084578	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:30.083	\N	\N	mg
372	\N	https://janoshik.com/tests/102437-Epithalon_10mg_QG5WEJ786M1I	Epithalon	\N	Uther	Unknown	99.165	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:34.624005	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:34.623	\N	\N	mg
373	\N	https://janoshik.com/tests/102438-Kisspeptin_10mg_G5I8JWCLVGZ9	Kisspeptin	\N	Uther	Unknown	99.545	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:02:39.344317	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:39.343	\N	\N	mg
374	\N	https://verify.janoshik.com/tests/109286-SERMORELIN_10MG_HS2RP4CJHLCX	SERMORELIN 10MG	\N	Uther	White Cap	99.532	\N	\N	2026-02-20	\N	t	f	2026-04-11 23:02:45.602709	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:45.601	\N	\N	mg
375	\N	https://verify.janoshik.com/tests/109284-TB500TB410MG_A1C8R464XAWT	TB-500 (TB4)	\N	Uther	TB410-0109	99.654	\N	\N	2026-02-20	\N	t	f	2026-04-11 23:02:50.411707	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:02:50.41	\N	\N	mg
376	\N	https://verify.janoshik.com/tests/114395-NAD_500mg_M6MZF8STUCK8	NAD+ 500-mg	\N	Uther	NAD500-0113	\N	984.1	\N	2026-03-13	\N	t	f	2026-04-11 23:02:55.027891	Janoshik	endotoxin	other	\N	\N	\N	\N	\N	t	2026-04-11 23:02:55.026	\N	\N	mg
377	\N	https://verify.janoshik.com/tests/96991-Reta20_RE201210_6VC3E58AF23T	Reta20 RE20-1210	\N	Uther	RE20-1210	\N	4.096	\N	2026-01-07	\N	t	f	2026-04-11 23:02:59.671787	Janoshik	endotoxin	other	\N	\N	\N	\N	\N	t	2026-04-11 23:02:59.671	\N	\N	mg
378	\N	https://verify.janoshik.com/tests/96990-Reta20_RE201210_24ZXIVQ84PFU	Retatrutide	\N	Uther	RE20-1210	99.719	\N	\N	2026-01-07	\N	t	f	2026-04-11 23:03:04.317388	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:04.316	\N	\N	mg
380	\N	https://verify.janoshik.com/tests/96185-MotsC_40_1RI49ZWY429E	Mots-C	\N	Uther	M040-1121	99.364	\N	\N	2026-01-05	\N	t	f	2026-04-11 23:03:13.803812	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:13.802	\N	\N	mg
382	\N	https://verify.janoshik.com/tests/89913-Tesamorelin_20mg_batch_1025_R8CX3GVPM9B4	Tesamorelin	\N	Uther	1025	99.726	\N	\N	2025-11-25	\N	t	f	2026-04-11 23:03:23.646735	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:23.645	\N	\N	mg
383	\N	https://verify.janoshik.com/tests/98995-adamax_10mg_KUIMW7A4W7AE	Adamax	\N	Uther	ADAM10-1119	99.807	\N	\N	2026-01-26	\N	t	f	2026-04-11 23:03:29.222214	Janoshik	mass_purity	other	\N	\N	\N	\N	\N	t	2026-04-11 23:03:29.221	\N	\N	mg
384	\N	https://verify.janoshik.com/tests/98994-mots_c_40mg_BDLHN9DX5R8K	MOTS-C	\N	Uther	M040-1207	99.521	\N	\N	2026-01-23	\N	t	f	2026-04-11 23:03:33.867769	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:33.866	\N	\N	mg
385	\N	https://verify.janoshik.com/tests/98997-pt_141_10mg_PUHSV81D15UA	PT-141	\N	Uther	PT10-1220	99.86	\N	\N	2026-01-23	\N	t	f	2026-04-11 23:03:38.544352	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:38.543	\N	\N	mg
386	\N	https://verify.janoshik.com/tests/98996-na_selank_10mg_WKHW5XA5ZIGB	N-Acetyl Selank Amidate	\N	Uther	NASK10-1228	99.898	\N	\N	2026-01-23	\N	t	f	2026-04-11 23:03:43.039165	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:43.038	\N	\N	mg
387	\N	https://verify.janoshik.com/tests/103425-bpc_157_20mg_DSPWXHCURGNV	BPC-157	\N	Uther	BP20-0105	99.527	\N	\N	2026-02-12	\N	t	f	2026-04-11 23:03:49.949995	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:49.948	\N	\N	mg
388	\N	https://verify.janoshik.com/tests/99090-3_a_M34jbtms6g1r	Tirzepatide	\N	Uther	ZE30-1211	99.883	\N	\N	2026-01-15	\N	t	f	2026-04-11 23:03:54.44159	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:54.44	\N	\N	mg
389	\N	https://verify.janoshik.com/tests/92053-re_50_Nzl2bapnfkub	Retatrutide	\N	Uther	RE50-1029	99.822	\N	\N	2025-12-08	\N	t	f	2026-04-11 23:03:59.114247	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:03:59.113	\N	\N	mg
390	\N	https://verify.janoshik.com/tests/91680-11_x99ucumv19p1	Tirzepatide	\N	Uther	ZE90-1030	99.898	\N	\N	2025-12-03	\N	t	f	2026-04-11 23:04:03.722413	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:04:03.721	\N	\N	mg
391	\N	https://verify.janoshik.com/tests/133663-A_9C3ZWNQ5W7BT	NAD + 500	\N	Uther	NA500-0306	\N	790.1	\N	2026-03-26	\N	t	f	2026-04-11 23:04:08.306606	Janoshik	endotoxin	other	\N	\N	\N	\N	\N	t	2026-04-11 23:04:08.305	\N	\N	mg
220	99264	https://janoshik.com/tests/99264-ghkcu_50mg_HK500107_QIW36H7VCR6M	GHK-Cu	50	Uther	HK50-0107	\N	\N	\N	2026-01-16	\N	f	f	2026-03-19 22:32:54.19	Janoshik	heavy_metals	other	\N	\N	\N	\N	\N	t	2026-04-11 23:08:13.145	\N	\N	mg
392	\N	https://janoshik.com/tests/122182-Hgh_frag_176191_5mg_GSZ975AX2UGY	Hgh frag 176-191	\N	Uther	1765-0305	99.821	\N	\N	2026-03-19	\N	f	f	2026-04-11 23:11:12.170662	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:11:12.169	\N	\N	mg
393	\N	https://janoshik.com/tests/122183-SS31_50mg_SS500305_46C46XB7M3AJ	SS-31	\N	Uther	SS50-0305	99.918	\N	\N	2026-03-20	\N	f	f	2026-04-11 23:11:16.912274	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:11:16.911	\N	\N	mg
394	\N	https://janoshik.com/tests/122179-tir30mg_ZE300304_XXSGT3VJK977	Tirzepatide	\N	Uther	ZE30-0304	99.825	\N	\N	2026-03-18	\N	f	f	2026-04-11 23:11:21.476392	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:11:21.475	\N	\N	mg
395	\N	https://janoshik.com/tests/123348-reta50mg_RE500309_X8RKR16LEZJX	Retatrutide	\N	Uther	RE50-0309	99.803	\N	\N	2026-03-23	\N	f	f	2026-04-11 23:11:48.882063	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:11:48.879	\N	\N	mg
396	\N	https://janoshik.com/tests/123349-reta20_RE200310_KAMCFLFBRMC4	Retatrutide	\N	Uther	RE20-0310	99.755	\N	\N	2026-03-23	\N	f	f	2026-04-11 23:11:53.989526	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:11:53.988	\N	\N	mg
397	\N	https://janoshik.com/tests/123345-ipa_10mg_3997_IP100309_P129I1KCM6S8	Ipamorelin	\N	Uther	IP10-0309	99.94	\N	\N	2026-03-24	\N	f	f	2026-04-11 23:11:58.835511	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:11:58.834	\N	\N	mg
398	\N	https://janoshik.com/tests/123347-Cjc_no_dac_10mg_CJND100309_G1434EMX6KBG	CJC-1295 (mod GRF 1-29)	\N	Uther	CJND10-0309	99.903	\N	\N	2026-03-24	\N	f	f	2026-04-11 23:12:04.307029	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:04.305	\N	\N	mg
399	\N	https://janoshik.com/tests/123350-motsc_40mg_MO400310_7M4M3NT4QTYT	MOTS-C	\N	Uther	M040-0310	99.041	\N	\N	2026-03-24	\N	f	f	2026-04-11 23:12:08.941256	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:08.94	\N	\N	mg
400	\N	https://janoshik.com/tests/123351-tesa_10mg_TE100310_S38S6NGEW32M	Tesamorelin	\N	Uther	TE10-0310	99.839	\N	\N	2026-03-24	\N	f	f	2026-04-11 23:12:14.210776	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:14.209	\N	\N	mg
401	\N	https://janoshik.com/tests/123353-mt1_10mg_MT1100311_1QVZMU4ENC9G	Melanotan 1	\N	Uther	MT110-0311	99.686	\N	\N	2026-03-24	\N	f	f	2026-04-11 23:12:19.184913	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:19.184	\N	\N	mg
402	\N	https://janoshik.com/tests/123358-semax_10mg_SX100311_UHBI5ERPHVW5	Semax	\N	Uther	SX10-0311	98.905	\N	\N	2026-03-24	\N	f	f	2026-04-11 23:12:24.271948	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:24.271	\N	\N	mg
403	\N	https://janoshik.com/tests/124995-tir60mg_ZE600312_PUD1UDDYYXIZ	Tirzepatide	\N	Uther	ZE60-0312	99.892	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:28.897737	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:28.896	\N	\N	mg
379	\N	https://verify.janoshik.com/tests/96993-Tadalafil_73F96THNKAKU	Tadalafil	23.5	Uther	RE20-1210	\N	\N	\N	2026-01-08	\N	t	f	2026-04-11 23:03:08.701237	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:23:33.875	\N	\N	mg
381	\N	https://verify.janoshik.com/tests/96240-5_Amino_50_2F7NSM5VPHLR	5-Amino-1-methylquinolinium	57.656666	Uther	51Q50-1124	\N	\N	\N	2026-01-05	\N	t	f	2026-04-11 23:03:18.496368	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:23:39.846	\N	\N	mg
404	\N	https://janoshik.com/tests/125012-tbbp_3030_TB30300315_LELGRRBG9N6E	BPC-157, TB-500 (TB4)	\N	Uther	T/B3030-0315	\N	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:33.738077	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:45.979	\N	\N	mg
405	\N	https://janoshik.com/tests/125013-glow_GLO700315_LHIPVPNQ1A3G	glow	\N	Uther	GLO70-0315	\N	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:38.688092	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:51.389	\N	\N	mg
406	\N	https://janoshik.com/tests/125000-tir30mg_ZE300313_WJ5G8P22GW1Q	Tirzepatide	\N	Uther	ZE30-0313	99.844	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:44.402224	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:44.401	\N	\N	mg
407	\N	https://janoshik.com/tests/124997-ghkcu_50mg_HK500312_7GD8BVSPZIQ6	GHK-Cu	\N	Uther	HK50-0312	99.835	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:48.986729	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:48.985	\N	\N	mg
408	\N	https://janoshik.com/tests/124999-tb_500_farg_10mg_TBF100312_4V22UG5EMWIV	TB-500	\N	Uther	TBF10-0312	99.897	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:54.282506	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:54.281	\N	\N	mg
409	\N	https://janoshik.com/tests/125001-pt141_10mg_PT100313_BYT2HN1JHSD1	PT-141	\N	Uther	PT10-0313	99.698	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:12:58.962943	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:12:58.962	\N	\N	mg
410	\N	https://janoshik.com/tests/125003-bpc10mg_BP100314_BNA34Q3AIP8M	BPC-157	\N	Uther	BP10-0314	99.741	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:13:04.132666	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:04.131	\N	\N	mg
411	\N	https://janoshik.com/tests/125005-kiss_10mg_KIS100313_BFENZSA8KPGE	Kisspeptin	\N	Uther	KIS10-0313	99.85	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:13:08.405412	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:08.404	\N	\N	mg
412	\N	https://janoshik.com/tests/125008-ghk_100mg_HK1000314_4B1GMYLKY3L3	GHK-Cu	\N	Uther	HK100-0314	99.831	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:13:13.314279	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:13.313	\N	\N	mg
413	\N	https://janoshik.com/tests/125009-motsc_10mg_MO100314_G314YSECAS8T	MOTS-C	\N	Uther	M010-0314	99.003	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:13:18.041366	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:18.04	\N	\N	mg
415	\N	https://janoshik.com/tests/125011-vesugen20_VESU200315_PDYIRLFIW3FE	Vesugen	\N	Uther	VESU20-0315	99.884	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:13:27.537565	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:27.536	\N	\N	mg
416	\N	https://janoshik.com/tests/136342-Hgh_H100228_4SPKV73S2HIE	Hgh	\N	Uther	H10-0228	97.617	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:13:32.749529	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:32.748	\N	\N	mg
418	\N	https://janoshik.com/tests/133975-mt2_10mg_MT2100321_TWXR56DGRKCE	Melanotan 2	\N	Uther	MT210-0321	99.888	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:13:42.302589	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:42.301	\N	\N	mg
419	\N	https://janoshik.com/tests/133978-bpc_10mg_BP100322_FM92ZN24HBSD	BPC-157	\N	Uther	BP10-0322	99.766	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:13:47.039549	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:47.038	\N	\N	mg
420	\N	https://janoshik.com/tests/133979-ghk_100mg_HK1000322_Z5AFQ88Z46YR	GHK-Cu	\N	Uther	HK100-0322	99.773	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:13:51.766707	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:51.765	\N	\N	mg
421	\N	https://janoshik.com/tests/133966-Cjc_dac_5mg_CJD50320_HXTYA6B1TFSX	CJC-1295 DAC	\N	Uther	CJD5-0320	98.882	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:13:56.634831	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:13:56.634	\N	\N	mg
422	\N	https://janoshik.com/tests/133962-reta20mg_RE200320_JSF7QRM74XUE	Retatrutide	\N	Uther	RE20-0320	99.886	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:01.681217	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:01.68	\N	\N	mg
423	\N	https://janoshik.com/tests/133977-tir60mg_ZE600322_QH4X2MBN2ZBJ	Tirzepatide	\N	Uther	ZE60-0322	99.914	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:06.401916	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:06.4	\N	\N	mg
424	\N	https://janoshik.com/tests/136353-reta20_RE200303_339YFC2PQ4PM	Retatrutide	\N	Uther	RE20-0303	99.849	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:11.286784	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:11.286	\N	\N	mg
425	\N	https://janoshik.com/tests/136344-vesugen_20mg_VESU200228_9GZU7Z2K6YH3	vesugen	\N	Uther	VESU20-0228	99.757	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:16.034332	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:16.033	\N	\N	mg
426	\N	https://janoshik.com/tests/136345-Brochogen_20mg_BRON200228_UUG8RVW8W18C	Brochogen	\N	Uther	BRON20-0228	99.766	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:21.073234	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:21.072	\N	\N	mg
428	\N	https://janoshik.com/tests/136343-reta_40mg_RE400228_B23RJH79YL5S	Retatrutide	\N	Uther	RE40-0228	99.78	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:30.774274	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:30.773	\N	\N	mg
429	\N	https://verify.janoshik.com/tests/136350-reta10mg_RE100302_FIYG6EQH7T1Z	Retatrutide	\N	Uther	RE10-0302	99.52	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:35.417528	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:35.416	\N	\N	mg
431	\N	https://janoshik.com/tests/136159-reta10_RE100316_KA3Y78663KVX	Retatrutide	\N	Uther	RE10-0316	99.786	\N	\N	2026-04-10	\N	f	f	2026-04-11 23:14:44.806762	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:44.806	\N	\N	mg
432	\N	https://janoshik.com/tests/136175-Tir100mg_ZE1000318_5Q4EYTMJNU5M	Tirzepatide	\N	Uther	ZE100-0318	99.921	\N	\N	2026-04-10	\N	f	f	2026-04-11 23:14:49.585351	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:49.584	\N	\N	mg
433	\N	https://janoshik.com/tests/136348-kpv_10mg_KP100301_9BWXJS7TTYHE	KPV	\N	Uther	KP10-0301	99.416	\N	\N	2026-04-10	\N	f	f	2026-04-11 23:14:54.789258	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:14:54.788	\N	\N	mg
434	\N	https://janoshik.com/tests/136354-tesa_10mg_TE100303_DV86EE8TXGYZ	Tesamorelin	\N	Uther	TE10-0303	99.62	\N	\N	2026-04-10	\N	f	f	2026-04-11 23:14:59.743136	Janoshik	mass_purity	peptide	\N	\N	\N	TE10-0303	\N	t	2026-04-11 23:14:59.742	\N	\N	mg
435	\N	https://janoshik.com/tests/136355-tesa_20mg_TE200303_6BFYGDB93EJ6	Tesamorelin	\N	Uther	TE20-0303	99.511	\N	\N	2026-04-10	\N	f	f	2026-04-11 23:15:04.766623	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:15:04.765	\N	\N	mg
436	\N	https://janoshik.com/tests/136185-Tir30mg_ZE300319_DLZ4D4YPQSGW	Tirzepatide	\N	Uther	ZE30-0319	99.892	\N	\N	2026-04-10	\N	f	f	2026-04-11 23:15:09.792127	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-11 23:15:09.791	\N	\N	mg
438	\N	https://janoshik.com/tests/91659-KPV_10_mg_37TGY9V3T5BM	KPV	\N	WWB	11/2025	97.841	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:49:58.096757	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:49:58.095	\N	\N	mg
482	\N	https://janoshik.com/tests/91669-Retatrutide_30_mg_5EAIXP8TS5TB	Retatrutide	\N	WWB	11/2025	99.896	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:34.905627	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:34.904	\N	\N	mg
417	\N	https://janoshik.com/tests/133973-Cjcipa_1010mg_CI10100321_46CPMD46CS4Y	Ipamorelin, CJC-1295 (mod GRF 1-29)	\N	Uther	CI1010-0321	\N	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:13:37.72397	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:24:03.082	\N	\N	mg
427	\N	https://janoshik.com/tests/136347-tesaipa_103_TI1030301_N1NSISJCZXLF	Ipamorelin, Tesamorelin	\N	Uther	T/1103-0301	\N	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:25.875311	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:24:08.436	\N	\N	mg
430	\N	https://janoshik.com/tests/136160-nad500_NA5000316_CEJNSM7Y95XA	NAD+	572.25	Uther	NA500-0316	\N	\N	\N	2026-04-09	\N	f	f	2026-04-11 23:14:40.253568	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:24:14.114	\N	\N	mg
439	\N	https://janoshik.com/tests/91700-SLUPP322_5mg_SSX45WKQSXWI	SLU-PP-322 5mg	2.62	WWB	Unknown	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:50:01.926831	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:24:20.614	\N	\N	mg
440	\N	https://verify.janoshik.com/tests/113456-te250_UZRKER1ANDED	Testosterone Enanthate	249.64	WWB	US warehouse batch	\N	\N	\N	2026-03-16	\N	t	f	2026-04-13 10:50:05.829397	Janoshik	lcms	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:24:26.252	\N	\N	mg
441	\N	https://verify.janoshik.com/tests/111780-Testosterone_Enanthate_250_QD9EZDC6EUTZ	Testosterone Enanthate	264.87	WWB	Black	\N	\N	\N	2026-03-10	\N	t	f	2026-04-13 10:50:10.476046	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:24:35.856	\N	\N	mg
443	\N	https://janoshik.com/tests/110669-Testosterone_Enanthate_300mg_ISTX72WBJGGH	Testosterone Enanthate	302.21	WWB	PA-SH8-926153-TEST-E300	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:50:21.369307	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:24:48.678	\N	\N	mg
483	\N	https://janoshik.com/tests/91670-Retatrutide_60_mg_CNZLW926XP7D	Retatrutide	\N	WWB	11/2025	99.876	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:39.925758	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:39.925	\N	\N	mg
484	\N	https://janoshik.com/tests/91671-Tirzepatide_60_mg_KDN9JTL9IURH	Tirzepatide	\N	WWB	11/2025	99.936	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:44.913278	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:44.912	\N	\N	mg
501	\N	https://janoshik.com/tests/91696-Retatrutide_20mg_1NI583N5YLJ1	Retatrutide	\N	WWB	11/2025	99.846	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:55:08.002786	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:55:08.001	\N	\N	mg
502	\N	https://janoshik.com/tests/91697-Cagrilintide_10mg_GF86HP3DEK5R	Cagrilintide	\N	WWB	Unknown	99.838	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:55:12.778265	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:55:12.777	\N	\N	mg
485	\N	https://janoshik.com/tests/91676-Test_Undecanoate_300_mg_7GLDAXI6LZYF	Testosterone Undecanoate	314.04	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:53:49.621848	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:44:28.356	\N	\N	mg
489	\N	https://janoshik.com/tests/91681-Semax_10_mg_PUJZRQJVU7PM	Semax	\N	WWB	09/2025	99.483	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:08.993511	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:54:08.992	\N	\N	mg
490	\N	https://janoshik.com/tests/91683-5Amino1MQ_50_mg_CWHFD39I7V9N	5-Amino-1MQ 50 mg	55.72	WWB	10/2025	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:14.348232	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 13:42:34.47	\N	\N	mg
488	\N	https://janoshik.com/tests/91679-LCarnitine_500_mg_9KKCARJ7MMDB	L-Carnitine 500 mg	598.95	WWB	Unknown	\N	\N	\N	2025-12-05	\N	t	f	2026-04-13 10:54:04.268717	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 13:42:45.028	\N	\N	mg
487	\N	https://janoshik.com/tests/91678-HMG_75_IU_4VR9JPSNP7TU	HMG	263.65	WWB	11/2025	\N	\N	\N	2025-12-05	\N	t	f	2026-04-13 10:53:59.377502	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 13:43:01.668	\N	\N	mg
494	\N	https://janoshik.com/tests/91689-Finasteride_Oral_Tablets_5_mg_9WQN33Y1WGD4	Finasteride	5.14	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:54:34.129696	Janoshik	mass	pill	\N	\N	\N	\N	\N	t	2026-04-13 13:41:38.201	\N	\N	mg
493	\N	https://janoshik.com/tests/91688-Anavar_Oral_Tablets_25_mg_HCW8XP2W62GK	Oxandrolone	25.01	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:54:29.188634	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:41:53.403	\N	\N	mg
492	\N	https://janoshik.com/tests/91687-Anavar_Oral_Tablets_10_mg_PTKKYVJ1QCWN	Oxandrolone	12.72	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:54:24.298521	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:41:54.45	\N	\N	mg
491	\N	https://janoshik.com/tests/91684-5Amino1MQ_10_mg_CD6VWG2EBFKT	5-Amino-1MQ 10 mg	11.4	WWB	11/2025	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:19.53452	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 13:42:17.114	\N	\N	mg
464	\N	https://janoshik.com/tests/87858-Sample_B01_HBGB1S9U87NI	Trenbolone Enanthate	201.32	WWB	Unknown	\N	\N	\N	2025-11-12	\N	t	f	2026-04-13 10:52:05.195262	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:45:57.459	\N	\N	mg
444	\N	https://verify.janoshik.com/tests/97820-Testosterone_Cypionate_250mg_KYZDXKHTGLYW	Testosterone Cypionate	254.17	WWB	Unknown	\N	\N	\N	2026-01-12	\N	t	f	2026-04-13 10:50:25.91398	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:24:53.896	\N	\N	mg
445	\N	https://janoshik.com/tests/110679-Testosterone_Cypionate_250mg_2LV7EBLJ1DDL	Testosterone Cypionate 250mg	\N	WWB	PA-SH8-581724-TEST-C250	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:50:30.74187	Janoshik	heavy_metals	aas	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:24:59.352	\N	\N	mg
446	\N	https://janoshik.com/tests/110672-Testosterone_Cypionate_250mg_HZZ5I62CJLV2	Testosterone Cypionate	245.17	WWB	PA-SH8-581724-TEST-C250	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:50:35.394847	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:06.389	\N	\N	mg
447	\N	https://janoshik.com/tests/87856-Sample_T02_Z2D6KYHZ3H7Z	Testosterone Cypionate	259.44	WWB	Unknown	\N	\N	\N	2025-11-12	\N	t	f	2026-04-13 10:50:40.32925	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:11.389	\N	\N	mg
448	\N	https://janoshik.com/tests/91672-Test_Cypionate_250_mg_Z946WB4YLP2N	Testosterone Cypionate	251.28	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:50:45.165968	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:16.893	\N	\N	mg
449	\N	https://janoshik.com/tests/110682-Testosterone_Propionate_200mg_IIIHWAMSWKQU	Testosterone Propionate 200mg	200	WWB	PA-SH8-407962-TEST-P200	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:50:50.265467	Janoshik	heavy_metals	aas	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:25:21.939	\N	\N	mg
450	\N	https://janoshik.com/tests/110680-Testosterone_Propionate_200mg_EUFTBLDIZ1RH	Testosterone Propionate	103.22	WWB	PA-SH8-407962-TEST-P200	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:50:55.466436	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:27.737	\N	\N	mg
451	\N	https://janoshik.com/tests/87855-Sample_T01_M7BFPWKEQ4BU	Testosterone Undecanoate	252.79	WWB	Unknown	\N	\N	\N	2025-11-12	\N	t	f	2026-04-13 10:51:00.339883	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:33.293	\N	\N	mg
452	\N	https://janoshik.com/tests/110662-Primobolan_Enanthate_200mg_6DBVSKF27I7B	Primobolan Enanthate 200mg	200	WWB	PA-SH8-471836-PRIM200	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:51:05.326336	Janoshik	heavy_metals	aas	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:25:38.146	\N	\N	mg
453	\N	https://janoshik.com/tests/110656-Primobolan_Enanthate_200mg_I83BIYLNXESJ	Primobolan Enanthate	202.92	WWB	PA-SH8-471836-PRIM200	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:51:10.231312	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:43.217	\N	\N	mg
454	\N	https://janoshik.com/tests/91673-Primobolan_E_200_mg_HUNIV9CKRJ8W	Methenolone Enanthate	206.88	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:51:15.275406	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:25:48.989	\N	\N	mg
456	\N	https://janoshik.com/tests/110663-Nandrolone_Decanoate_Deca_300mg_CK1PABPFR2ZJ	Nandrolone Decanoate	288.97	WWB	PA-SH8-628491-DECA300	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:51:25.543569	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:26:01.653	\N	\N	mg
457	\N	https://verify.janoshik.com/tests/96780PN200_AIK4PDP5KLKT	Unknown	\N	WWB	12/19/2028	\N	\N	\N	2026-01-12	\N	t	f	2026-04-13 10:51:30.476676	Janoshik	lcms	other	\N	\N	\N	\N	\N	t	2026-04-13 19:26:07.689	\N	\N	mg
458	\N	https://verify.janoshik.com/tests/96788-PN200_4WE92E3U1GPF	Unknown	\N	WWB	12/19/2028	\N	\N	\N	2026-01-08	\N	t	f	2026-04-13 10:51:35.2336	Janoshik	heavy_metals	\N	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:26:13.17	\N	\N	mg
459	\N	https://verify.janoshik.com/tests/96783-PN200_DJ8UP2NGLCTR	Unknown	\N	WWB	12/19/2028	\N	\N	\N	2026-01-20	\N	t	f	2026-04-13 10:51:40.243672	Janoshik	\N	other	\N	\N	\N	\N	\N	t	2026-04-13 19:26:18.37	\N	\N	mg
460	\N	https://janoshik.com/tests/110668-Nandrolone_Phenylpropionate_NPP_200mg_DTNL52IL4KRN	Nandrolone Phenylpropionate (NPP) 200mg	200	WWB	PA-SH8-793542-NPP200	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:51:45.257842	Janoshik	heavy_metals	aas	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:26:24.704	\N	\N	mg
461	\N	https://janoshik.com/tests/110666-Nandrolone_Phenylpropionate_NPP_200mg_LZ2B4PF4MK11	Nandrolone Phenylpropionate	181.56	WWB	PA-SH8-793542-NPP200	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:51:50.130773	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:26:30.681	\N	\N	mg
462	\N	https://verify.janoshik.com/tests/96779PN200_A6GPRXHLWV29	Nandrolone Phenylpropionate	\N	WWB	12/19/2028	\N	\N	\N	2026-01-08	\N	t	f	2026-04-13 10:51:54.896119	Janoshik	lcms	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:26:36.196	\N	\N	mg
463	\N	https://janoshik.com/tests/91675-Deca_Nandrolone_Decanoate_300_mg_BH6E6ETRBB9G	Nandrolone Decanoate	291.12	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:51:59.724132	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 19:26:41.268	\N	\N	mg
486	\N	https://janoshik.com/tests/91677-HCG_5000_IU_B991AVRPHEWT	HCG	6307	WWB	11/2025	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:54.514974	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:26:46.351	\N	\N	IU
466	\N	https://janoshik.com/tests/91698-HGH_36iu_1TK2R3D6CLPI	HGH 36iu	\N	WWB	Unknown	96.986	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:52:14.979209	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:52:14.978	\N	\N	mg
467	\N	https://verify.janoshik.com/tests/95837_QS7JVV4E4JJG	HGH	\N	WWB	Unknown	96.745	\N	\N	2026-01-02	\N	t	f	2026-04-13 10:52:20.0653	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:52:20.064	\N	\N	mg
472	\N	https://janoshik.com/tests/91656-SS31_50_mg_7T1RMPMES15F	SS-31	\N	WWB	11/2025	99.773	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:52:44.464866	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:52:44.463	\N	\N	mg
473	\N	https://janoshik.com/tests/91657-TB500_TB4_20_mg_M5RBWAGVGFSI	TB-500 (TB4)	\N	WWB	11/2025	99.662	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:52:49.425212	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:52:49.424	\N	\N	mg
474	\N	https://janoshik.com/tests/91658-Ipamorelin_10_mg_51T1DSP19AQ7	Ipamorelin	\N	WWB	11/2025	99.892	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:52:53.92761	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:52:53.926	\N	\N	mg
475	\N	https://janoshik.com/tests/91660-MOTSC_10_mg_WF18UQPA73VA	MOTS-C	\N	WWB	11/2025	99.636	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:52:59.467669	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:52:59.466	\N	\N	mg
476	\N	https://janoshik.com/tests/91661-MOTSC_40_mg_DTAR3HAJZNF9	MOTS-C	\N	WWB	11/2025	99.561	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:04.632435	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:04.631	\N	\N	mg
477	\N	https://janoshik.com/tests/91662-Melanotan_II_10_mg_XXFWQUQEPTTN	Melanotan II	\N	WWB	11/2025	99.784	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:09.902188	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:09.901	\N	\N	mg
478	\N	https://janoshik.com/tests/91663-Melanotan_I_10_mg_CWF8Q9NK6F3G	Melanotan I	\N	WWB	11/2025	99.466	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:14.543788	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:14.543	\N	\N	mg
479	\N	https://janoshik.com/tests/91664-Tesamorelin_10_mg_I5QVXVR9WZ9Y	Tesamorelin	\N	WWB	11/2025	99.061	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:19.52483	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:19.524	\N	\N	mg
480	\N	https://janoshik.com/tests/91665-Tesamorelin_20_mg_RLPSP42W176F	Tesamorelin	\N	WWB	11/2025	99.45	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:53:25.120069	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:25.119	\N	\N	mg
481	\N	https://janoshik.com/tests/91666-HGH_Fragment_176191_5_mg_U2Y4LMBN1Q1W	HGH Fragment 176-191	\N	WWB	10/2025	98.259	\N	\N	2025-12-05	\N	t	f	2026-04-13 10:53:30.133189	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:53:30.132	\N	\N	mg
500	\N	https://janoshik.com/tests/91695-Retatrutide_60mg_HNF2YTKPJE57	Retatrutide	\N	WWB	11/2025	99.367	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:55:03.244895	Janoshik	mass_purity	peptide	\N	\N	\N	\N	\N	t	2026-04-13 10:55:03.243	\N	\N	mg
498	\N	https://janoshik.com/tests/91693-SLUPP332_Oral_Tablets_5_mg_I4CPRVJTJ8YF	SLU-PP-332	6.11	WWB	Unknown	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:53.288032	Janoshik	mass	pill	\N	\N	\N	\N	\N	t	2026-04-13 13:38:56.748	\N	\N	mg
499	\N	https://janoshik.com/tests/91694-SLUPP332_Oral_Tablets_20_mg_QJAIDSF9667U	SLU-PP-332	24.78	WWB	Unknown	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:58.224326	Janoshik	mass	pill	\N	\N	\N	\N	\N	t	2026-04-13 13:39:56.765	\N	\N	mg
497	\N	https://janoshik.com/tests/91692-Tesofensine_Oral_Tablets_500_mcg_474U1GRIX2VZ	Tesofensine	608.98	WWB	Unknown	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:48.452628	Janoshik	mass	pill	\N	\N	\N	\N	\N	t	2026-04-13 13:40:14.697	\N	\N	mg
496	\N	https://janoshik.com/tests/91691-Telmisartan_Oral_Tablets_40_mg_P38P45FNZJH4	Telmisartan	46.34	WWB	Unknown	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:54:43.624074	Janoshik	mass	pill	\N	\N	\N	\N	\N	t	2026-04-13 13:41:08.685	\N	\N	mg
495	\N	https://janoshik.com/tests/91690-Arimidex_Anastrozole_Oral_Tablets_1_mg_8MI6GT3IQHL4	Arimidex (Anastrozole)	1.34	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:54:38.811713	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:41:09.303	\N	\N	mg
471	\N	https://janoshik.com/tests/87860-Sample_R01_LRMFEAVUM1IX	Anastrozole	0.85	WWB	Unknown	\N	\N	\N	2025-11-13	\N	t	f	2026-04-13 10:52:39.695395	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:44:43.657	\N	\N	mg
470	\N	https://janoshik.com/tests/87864-Sample_N01_2NSVT468FI7E	Tamoxifen Citrate	21.18	WWB	Unknown	\N	\N	\N	2025-11-12	\N	t	f	2026-04-13 10:52:34.888397	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 13:44:56.06	\N	\N	mg
469	\N	https://janoshik.com/tests/87865-Sample_C01_IPUK8W5FUEB6	Clomiphene Citrate	54.7	WWB	Unknown	\N	\N	\N	2025-11-12	\N	t	f	2026-04-13 10:52:29.932519	Janoshik	mass	pill	\N	\N	\N	\N	\N	t	2026-04-13 13:45:06.435	\N	\N	mg
468	\N	https://janoshik.com/tests/89012-Sample_A01_SEUSY54W18LW	Estradiol Cypionate	10.5	WWB	Unknown	\N	\N	\N	2025-11-18	\N	t	f	2026-04-13 10:52:25.011475	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:45:21.655	\N	\N	mg
465	\N	https://janoshik.com/tests/91674-Tren_Enanthate_200_mg_DD7Y6T4G1JX6	Tren Enanthate 200 mg	195.01	WWB	Unknown	\N	\N	\N	2025-12-03	\N	t	f	2026-04-13 10:52:09.93246	Janoshik	mass	aas	\N	\N	\N	\N	\N	t	2026-04-13 13:45:40.371	\N	\N	mg
503	\N	https://janoshik.com/tests/91699-5amino1mq_5mg_2H438FPIRBRY	5-Amino-1-methylquinolinium	4.39	WWB	Unknown	\N	\N	\N	2025-12-04	\N	t	f	2026-04-13 10:55:17.777968	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 13:38:45.095	\N	\N	mg
12	92175	https://janoshik.com/tests/92175-tbbp_1010_TB10101112_KPCSWF7GVR7V	TB4 + BPC-157	\N	Uther	T/B1010-1112	\N	\N	\N	2025-12-10	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:18:55.977	\N	\N	mg
16	92155	https://janoshik.com/tests/92155-klow_KL801127_V8YSQK9JHQS9	K-Low	\N	Uther	KL80-1127	\N	\N	\N	2025-12-10	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:01.546	\N	\N	mg
43	93077	https://janoshik.com/tests/93077-tesaipa103_TI1031202_NN876YM37P8E	Tesamorelin + Ipamorelin	\N	Uther	T/I103-1202	\N	\N	\N	2025-12-12	\N	f	f	2026-03-19 22:32:53.748	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:25.509	\N	\N	mg
58	93621	https://janoshik.com/tests/93621-illumineeuro_ILL561202_VUCRIH86X4KT	Illuminee	\N	Uther	ILL56-1202	\N	\N	\N	2025-12-16	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:19:36.821	\N	\N	mg
91	95865	https://janoshik.com/tests/95865-nad500_NA5001216_LJ4TVJEGR91T	NAD+ 500	534.68	Uther	NA500-1216	\N	\N	\N	2025-12-31	\N	f	f	2026-03-19 22:32:54.047	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:20:17.395	\N	\N	mg
139	96971	https://janoshik.com/tests/96971-nad500_NA5001226_L4LBVUYW81ZR	NAD+ 500	512.63	Uther	NA500-1226	\N	\N	\N	2026-01-07	\N	f	f	2026-03-19 22:32:54.055	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:20:29.532	\N	\N	mg
162	98249	https://verify.janoshik.com/tests/98249-cjcipa_611_CI6111231_T21YSGD8CJT2	CJC + Ipamorelin	\N	Uther	C/I611-1231	\N	\N	\N	2026-01-12	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:20:40.183	\N	\N	mg
166	98246	https://verify.janoshik.com/tests/98246-tbbp_1010_TB10101229_KT695BAIPXNM	TB4 + BPC-157	\N	Uther	T/B1010-1229	\N	\N	\N	2026-01-13	\N	f	f	2026-03-19 22:32:54.061	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:20:45.676	\N	\N	mg
214	102831	https://verify.janoshik.com/tests/102831-klow_KLO800117_S6JDQREBGP21	K-Low	\N	Uther	KL080-0117	\N	\N	\N	2026-01-28	\N	f	f	2026-03-19 22:32:54.19	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:21:14.947	\N	\N	mg
262	105229	https://verify.janoshik.com/tests/105229-nad500_NA5000122_GCRZYK49G6XL	NAD+ 500	549.93	Uther	NA500-0122	\N	\N	\N	2026-02-06	\N	f	f	2026-03-19 22:32:54.199	Janoshik	mass	other	\N	\N	\N	\N	\N	t	2026-04-13 19:21:56.081	\N	\N	mg
322	109555	https://janoshik.com/tests/109555-glow_GL700206_GQX9EDUJLPVB	Glow	\N	Uther	GL70-0206	\N	\N	\N	2026-02-23	\N	f	f	2026-03-19 22:32:54.205	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:07.537	\N	\N	mg
356	\N	https://janoshik.com/tests/102096-Tirzepatide_30mg_8DVN3YT89DWR	Tirzepatide 30mg	30	Uther	Unknown	\N	\N	\N	2026-01-27	\N	t	f	2026-04-11 23:01:18.562518	Janoshik	lcms	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:22:59.671	\N	\N	mg
369	\N	https://janoshik.com/tests/102427-NAD_500mg_WA36SVQBX535	NAD+	569.78	Uther	Unknown	\N	\N	\N	2026-01-30	\N	t	f	2026-04-11 23:02:20.854442	Janoshik	mass_purity	other	\N	\N	\N	\N	\N	t	2026-04-13 19:23:28.642	\N	\N	mg
414	\N	https://janoshik.com/tests/125010-cjcipa_55_CI550315_DQQLHXXRQ7CF	Ipamorelin, CJC-1295 (mod GRF 1-29)	\N	Uther	C/155-0315	\N	\N	\N	2026-03-27	\N	f	f	2026-04-11 23:13:22.817646	Janoshik	mass	peptide	\N	\N	\N	\N	\N	t	2026-04-13 19:23:57.133	\N	\N	mg
442	\N	https://janoshik.com/tests/110671-Testosterone_Enanthate_300mg_DAZ5UB86CZHT	Testosterone Enanthate 300mg	300	WWB	PA-SH8-926153-TEST-E300	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:50:16.21476	Janoshik	heavy_metals	aas	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:24:42.883	\N	\N	mg
455	\N	https://janoshik.com/tests/110665-Nandrolone_Decanoate_Deca_300mg_DWZAV3VYN6SP	Nandrolone Decanoate (Deca) 300mg	300	WWB	PA-SH8-628491-DECA300	\N	\N	\N	2026-02-26	\N	t	f	2026-04-13 10:51:20.594013	Janoshik	heavy_metals	aas	not detected.	not detected.	not detected.	not detected.	\N	t	2026-04-13 19:25:55.549	\N	\N	mg
\.


--
-- Data for Name: lookup_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lookup_attempts (id, identifier, failed_attempts, blocked_until, last_attempt_at) FROM stdin;
2e6d5a2d-c73b-4b80-89d7-e60706372d96	4170	1	\N	2026-03-18 22:43:07.734+00
a4cfc352-b814-451a-b4af-bfa60869c5dd	2164	0	\N	2026-03-18 23:14:46.611+00
aaf55f30-e898-4109-844f-b8740e19e235	'or 1=1--	1	\N	2026-03-19 16:30:29.204+00
af73c112-e1b9-4790-b67b-706a949f64e4	8148	0	\N	2026-03-19 17:01:09.207+00
b1ce9110-5b4f-460c-bc4f-d76d7479db40	@test	0	\N	2026-03-18 20:00:57.786+00
b21114fa-3a19-4476-9617-8dc37cf04707	test	1	\N	2026-03-19 16:28:52.926+00
c517508c-903e-41b0-80f9-b9aad958dcd6	@urbanblend789	0	\N	2026-03-18 19:00:49.017+00
cde452bc-164b-4eaa-9694-a758e5c2b8c0	pink ladybug	0	\N	2026-03-19 16:36:02.797+00
ec04d373-7f57-402a-84ba-1410259ea824	scott	0	\N	2026-03-19 16:36:02.691+00
f6814e21-9f87-487e-8d8c-c7d4bb2c2383	@entangledpep	0	\N	2026-03-19 16:34:08.109+00
\.


--
-- Data for Name: order_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_line_items (id, order_id, product_id, product_name, quantity, unit_price, line_total, created_at, updated_at, is_oos) FROM stdin;
00c14223-3de3-40a3-b32b-f963766b3ff2	3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1	p012	Retatrutide 40mg	1.00	165.00	165.00	2026-03-18 20:20:09.108+00	2026-03-18 20:20:09.108+00	f
045bd1a3-13a9-4aec-83a2-1ad79d067cc8	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p057	Ipamorelin 10mg	1.00	80.00	80.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
059f8ec1-1839-4ffb-a69a-26cc2dda10ae	17b2c399-9bba-4740-8b1e-751b5baaa252	p110	Cortagen 20mg	0.50	120.00	60.00	2026-03-18 20:20:08.942+00	2026-03-18 20:20:08.942+00	f
06b2e768-c30a-47e4-a991-2ad7096f205d	c0a3135e-928e-4285-8916-e1f7ed71e04b	p020	GAC water 3ml	1.00	15.00	15.00	2026-03-18 20:20:08.917+00	2026-03-18 20:20:08.917+00	f
085e0a8b-7508-42ff-b882-fbac4555c93e	c67237d3-15ca-4487-b138-43c30d2e1df0	p039	Epitalon 10mg	2.00	45.00	90.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
0c322c29-3763-455b-abbf-d4fb4123d9d5	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p085	KPV 30mg	0.50	145.00	72.50	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
0e5a319b-4b8a-4604-bac8-133667736ead	e8b38f59-85d4-4c03-9581-eca90f3bf35f	p007	Tirzepatide 60mg	1.00	135.00	135.00	2026-03-18 20:20:09+00	2026-03-18 20:20:09+00	f
0eeb1a71-3f32-483a-9543-f91da2299cdd	c310cffd-47c0-4225-ade9-62923897b77f	p084	KPV 10mg	1.00	60.00	60.00	2026-03-18 20:20:08.899+00	2026-03-18 20:20:08.899+00	f
0f3ae874-25a0-4b30-ae39-99f71483607d	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p024	HGH 10IU	1.00	50.00	50.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
11161c95-1fec-4488-8165-27b0d5b01fc2	c0a3135e-928e-4285-8916-e1f7ed71e04b	p008	Tirzepatide 100mg	1.00	220.00	220.00	2026-03-18 20:20:08.917+00	2026-03-18 20:20:08.917+00	f
11b5b89c-e9db-478c-a454-48371a56da02	d25da38b-20aa-40ff-ba34-e1638b380836	p024	HGH 10IU	3.00	50.00	150.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
11f966db-f067-4ec7-a884-80f932ec47ef	c67237d3-15ca-4487-b138-43c30d2e1df0	p062	Selank 10mg	1.00	55.00	55.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
12c545fe-b5be-4a5e-98cb-559d191970e4	bb1c75a0-a705-4887-9f13-38ed114c6af3	p004	Tirzepatide 20mg	1.00	85.00	85.00	2026-03-18 23:17:30.972+00	2026-03-18 23:17:30.972+00	f
12f728f6-c12c-40b0-bffe-0a66ac3b2ced	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
14e5799f-418f-4553-9571-e63e081e160e	b0ca116d-aaea-4b84-9ae0-8cac8ad64280	p069	DSIP 5mg	1.00	35.00	35.00	2026-03-18 20:20:09.097+00	2026-03-18 20:20:09.097+00	f
155afa06-600d-4f5a-8943-8d87126e7a0c	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p030	BPC 157 10mg	1.00	45.00	45.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
155fa6e3-a08d-4234-9029-dd53207a02fe	872ee5ff-b754-4068-ad98-c7c06c86e42d	p007	Tirzepatide 60mg	1.00	135.00	135.00	2026-03-18 20:20:09.067+00	2026-03-18 20:20:09.067+00	f
16d4b084-e8f3-455f-922e-fa6b0504c5c8	83a3d960-ba23-47a3-883c-ed6883ab9d27	p118	Vesilute 20mg	1.00	120.00	120.00	2026-03-18 20:20:09.071+00	2026-03-18 20:20:09.071+00	f
170dfb42-e15f-459f-af09-61e9ad2b855a	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p007	Tirzepatide 60mg	0.50	135.00	67.50	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
172b21c7-8208-4313-9fc5-44831ec771cd	17b2c399-9bba-4740-8b1e-751b5baaa252	p049	Tesamorelin 10mg	0.50	125.00	62.50	2026-03-18 20:20:08.942+00	2026-03-18 20:20:08.942+00	f
18551a57-1fc8-4c3d-a57f-25bf5aaa8672	c0a3135e-928e-4285-8916-e1f7ed71e04b	p012	Retatrutide 40mg	1.00	165.00	165.00	2026-03-18 20:20:08.917+00	2026-03-18 20:20:08.917+00	f
1a00f57b-cf08-4efe-b81e-d7dd28f1ef06	e8b38f59-85d4-4c03-9581-eca90f3bf35f	p024	HGH 10IU	1.00	50.00	50.00	2026-03-18 20:20:09+00	2026-03-18 20:20:09+00	f
26e7c5e6-1026-4a87-abbe-4e81174d947e	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p042	Melanotan II 10mg	0.50	40.00	20.00	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
2738030e-e06d-487c-8fea-9c0960d18f3f	d25da38b-20aa-40ff-ba34-e1638b380836	p003	Tirzepatide 15mg	1.00	80.00	80.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
283d5ac3-1d3e-4857-b66d-2780671bf3cb	0581d320-40f1-40e7-9adb-cd05ffaabda1	p108	Vilon 20mg	1.00	120.00	120.00	2026-03-18 20:20:09.024+00	2026-03-18 20:20:09.024+00	f
288f4d54-b9d0-4839-b2ba-f94dc4a57169	05edc6e3-04b1-4487-bdda-898348202bfb	p017	Survodutide 10mg	1.00	170.00	170.00	2026-03-18 20:20:09.076+00	2026-03-18 20:20:09.076+00	f
28a99453-8ca2-431a-8b89-74dcd6fe5c01	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p089	KLOW (TB10+BPC10+KPV10+GHK50)	1.00	160.00	160.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
297118df-50ef-48ab-b6a1-6b53879541d7	fb87ced5-8e31-4eaf-a3cd-64cba23b3188	p007	Tirzepatide 60mg	2.00	135.00	270.00	2026-03-18 20:20:08.924+00	2026-03-18 20:20:08.924+00	f
298d5e58-c3f4-4cfe-a64e-5185ec89a41c	a4cab9d2-7cb6-4f24-baa6-208f41bad4ca	p080	NAD+ 500mg	1.00	95.00	95.00	2026-03-18 20:20:08.905+00	2026-03-18 20:20:08.905+00	f
2aa851bf-d359-4f3c-957b-5d49b087d863	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p002	Tirzepatide 10mg	1.00	65.00	65.00	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
2d3034cc-8ef2-4d18-aaab-a2f8d154b9c3	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p025	IGF-1 LR3 1mg	1.00	210.00	210.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
2da837ef-1098-445e-b99a-509cc10b7fd7	c310cffd-47c0-4225-ade9-62923897b77f	p024	HGH 10IU	2.00	50.00	100.00	2026-03-18 20:20:08.899+00	2026-03-18 20:20:08.899+00	f
2dfc780b-5f3d-43ae-bf22-25177ef81468	83a3d960-ba23-47a3-883c-ed6883ab9d27	p039	Epitalon 10mg	1.00	45.00	45.00	2026-03-18 20:20:09.071+00	2026-03-18 20:20:09.071+00	f
2f9bbe79-35cf-4db9-bf1d-9180d3ed14af	f7a805fd-f97e-4689-a011-2737dadc372f	p080	NAD+ 500mg	1.00	95.00	95.00	2026-03-18 20:20:08.959+00	2026-03-18 20:20:08.959+00	f
31cd4fa0-97c7-4f64-a7ef-93f85187955e	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p072	BPC 10mg / TB4 10mg Blend	3.00	135.00	405.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
31e60a3c-7815-44c3-a951-987724b676e8	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p013	Retatrutide 50mg	1.00	205.00	205.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
32a83f5d-c655-4f5a-9cd4-1f79dfcc79ae	c67237d3-15ca-4487-b138-43c30d2e1df0	p012	Retatrutide 40mg	2.00	165.00	330.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
335b7fd1-5ce6-47b6-9019-753c12aeb9fc	fb87ced5-8e31-4eaf-a3cd-64cba23b3188	p078	GHK-CU 100mg	3.00	51.00	153.00	2026-03-18 20:20:08.924+00	2026-03-18 20:20:08.924+00	f
3398f41e-ba84-4bc8-bd5b-422feea7835e	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p091	Ara-290 16mg	2.00	60.00	120.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
35342a0e-6866-4fe2-bc2b-7c6e0d5973f0	ed8e0967-57d6-421d-906e-8ca68e8cc3ba	p089	KLOW (TB10+BPC10+KPV10+GHK50)	1.00	160.00	160.00	2026-03-18 20:20:09.062+00	2026-03-18 20:20:09.062+00	f
3676b54b-b871-44df-aeb7-49220f2e0f76	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p042	Melanotan II 10mg	1.00	40.00	40.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
36ae5ce2-da49-47c1-b9ce-b6ef92b7af23	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p052	Mots-C 20mg	1.00	95.00	95.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
36af92ee-510d-4b2c-807c-5eeb41ed6ead	9ece120d-7dbc-4009-ae0c-658d3d58b3d5	p097	HCG 2000 IU GMP 3ml 10vials	1.00	70.00	70.00	2026-03-18 20:20:09.057+00	2026-03-18 20:20:09.057+00	f
3717fc75-db90-4f40-9414-316c56786648	813442f1-cfc6-45bc-9a82-3d1a63068328	p007	Tirzepatide 60mg	1.00	135.00	135.00	2026-03-18 20:20:09.046+00	2026-03-18 20:20:09.046+00	f
3995ca85-47d3-4840-a3d7-30b3a0327c8d	813442f1-cfc6-45bc-9a82-3d1a63068328	p019	BAC water 10ml	1.00	25.00	25.00	2026-03-18 20:20:09.046+00	2026-03-18 20:20:09.046+00	f
3a47d1d3-a70b-4034-92e3-c350fb726bda	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p080	NAD+ 500mg	1.00	95.00	95.00	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
3a661136-729b-428b-aeb8-7a13b92c3a20	3a5df063-138c-4498-bef2-6d733ca93ea2	p007	Tirzepatide 60mg	1.00	135.00	135.00	2026-03-18 20:20:08.93+00	2026-03-18 20:20:08.93+00	f
3a9a5708-d9dc-4db2-881e-4281149d5159	c67237d3-15ca-4487-b138-43c30d2e1df0	p011	Retatrutide 30mg	1.00	155.00	155.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
3ab9a605-f248-4fa3-9de1-b2b44fff3965	c0a3135e-928e-4285-8916-e1f7ed71e04b	p014	Cagrilintide 5mg	1.00	90.00	90.00	2026-03-18 20:20:08.917+00	2026-03-18 20:20:08.917+00	f
3c3a64e9-a589-43ce-9814-09f0ff0b4537	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p062	Selank 10mg	0.50	55.00	27.50	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
3ed0e231-d63b-4c61-b010-e17c74f5dc90	b0ca116d-aaea-4b84-9ae0-8cac8ad64280	p090	PE-22-28 10mg	0.50	70.00	35.00	2026-03-18 20:20:09.097+00	2026-03-18 20:20:09.097+00	f
436d8e7e-165a-427d-8588-d79ea3642cd0	208c5098-466d-41e8-9f75-0218fbf1db3f	p073	CJC No DAC / Ipa 10/10mg	1.00	75.00	75.00	2026-03-18 20:20:09.013+00	2026-03-18 20:20:09.013+00	f
4497d20f-3d7f-4745-887c-663e197147df	3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1	p007	Tirzepatide 60mg	2.00	135.00	270.00	2026-03-18 20:20:09.108+00	2026-03-18 20:20:09.108+00	f
463af238-9730-4bad-8817-77ad8bfe2bd8	0581d320-40f1-40e7-9adb-cd05ffaabda1	p097	HCG 2000 IU GMP 3ml 10vials	2.00	70.00	140.00	2026-03-18 20:20:09.024+00	2026-03-18 20:20:09.024+00	f
467ce838-dfaf-480d-a34f-14696d6f7d0e	0581d320-40f1-40e7-9adb-cd05ffaabda1	p024	HGH 10IU	2.00	50.00	100.00	2026-03-18 20:20:09.024+00	2026-03-18 20:20:09.024+00	f
4a08f43f-5e37-4006-81a9-598417d5687f	a22f7966-b42d-4cab-81c3-c94983f0e590	p050	Tesamorelin 20mg	1.00	220.00	220.00	2026-03-18 20:20:09.102+00	2026-03-18 20:20:09.102+00	f
4db20f36-809f-4155-bca7-9834b05e03ed	b096c66d-5870-4010-9511-45e13727908c	p009	Retatrutide 10mg	1.00	95.00	95.00	2026-03-18 20:20:08.995+00	2026-03-18 20:20:08.995+00	f
4ebf4f6c-d433-4097-961b-5fcdf6a20131	7522e0b8-cf16-40ef-aff9-9b3180098433	p007	Tirzepatide 60mg	1.00	135.00	135.00	2026-03-18 20:20:09.018+00	2026-03-18 20:20:09.018+00	f
506127c0-9002-4a21-b240-3cc7f2e02d0d	3a5df063-138c-4498-bef2-6d733ca93ea2	p109	Cartalax 20mg	0.50	120.00	60.00	2026-03-18 20:20:08.93+00	2026-03-18 20:20:08.93+00	f
529a5082-8455-4339-88b6-66fa63cb744d	d25da38b-20aa-40ff-ba34-e1638b380836	p011	Retatrutide 30mg	1.00	155.00	155.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
52b41ae1-6a07-4ae5-a386-f889b287c21f	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p090	PE-22-28 10mg	0.50	70.00	35.00	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
531a7bf9-b807-4f7c-9215-ea93e83932ce	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p030	BPC 157 10mg	1.00	45.00	45.00	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
53a2235a-6b7a-4e83-889a-976072c835c9	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p052	Mots-C 20mg	0.50	95.00	47.50	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
5a19e936-f7af-4dc0-839d-0cdbd9a283c7	f390e78f-35ca-4021-a236-a0c36532a061	p010	Retatrutide 20mg	1.00	120.00	120.00	2026-03-18 20:20:08.948+00	2026-03-18 20:20:08.948+00	f
5b84ecf0-7887-4cf9-bd64-1db73bf1104d	fff847e8-871c-423b-86c5-eddea6dfe217	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:08.936+00	2026-03-18 20:20:08.936+00	f
5b94425e-dfae-4fc1-ad17-faaf06c6057f	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p055	SS-31 30mg	0.50	155.00	77.50	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
5e1e72ff-8372-452d-a141-8cad8d472337	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p024	HGH 10IU	1.00	50.00	50.00	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
5e5eaee3-f0bb-40f8-a1e0-2d7c2d0cc915	05edc6e3-04b1-4487-bdda-898348202bfb	p007	Tirzepatide 60mg	3.00	135.00	405.00	2026-03-18 20:20:09.076+00	2026-03-18 20:20:09.076+00	f
630a2eb6-9612-4bb2-beae-8e33255414e2	fb87ced5-8e31-4eaf-a3cd-64cba23b3188	p087	KPV & GHK-CU Blend	1.00	110.00	110.00	2026-03-18 20:20:08.924+00	2026-03-18 20:20:08.924+00	f
6541fc38-5675-4b95-842a-ffe3cc545d18	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p053	Mots-C 40mg	1.00	160.00	160.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
674dca79-b63c-45f8-81e1-4c255a25c686	c67237d3-15ca-4487-b138-43c30d2e1df0	p061	Semax 10mg	1.00	55.00	55.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
68f99ced-a8d1-402b-926a-5288e929a8ff	d25da38b-20aa-40ff-ba34-e1638b380836	p010	Retatrutide 20mg	4.00	120.00	480.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
69665197-fc4c-412b-89fc-42eca26a3907	c67237d3-15ca-4487-b138-43c30d2e1df0	p102	Cerebrolysin 30mg GMP 10ml 10vials	1.00	45.00	45.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
6e27ed2f-9a48-4926-8e07-d63d3387c100	e00b0557-6024-42ab-826c-31d5da1e3674	p019	BAC water 10ml	1.00	25.00	25.00	2026-03-18 20:20:09.091+00	2026-03-18 20:20:09.091+00	f
70dfb4c6-9266-43ea-b5d0-0f245bec62f7	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p110	Cortagen 20mg	0.50	120.00	60.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
71c148d1-375a-45d9-943b-77abe1b67b6d	b096c66d-5870-4010-9511-45e13727908c	p071	BPC 5mg / TB4 5mg Blend	1.00	80.00	80.00	2026-03-18 20:20:08.995+00	2026-03-18 20:20:08.995+00	f
721dd180-da29-4ec0-84cb-97e72de84b7c	c310cffd-47c0-4225-ade9-62923897b77f	p102	Cerebrolysin 30mg GMP 10ml 10vials	1.00	45.00	45.00	2026-03-18 20:20:08.899+00	2026-03-18 20:20:08.899+00	f
72cec78b-bdc2-4386-a2f9-1aa14c505864	c67237d3-15ca-4487-b138-43c30d2e1df0	p026	5-Amino-1MQ 50mg	1.00	75.00	75.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
749237e3-0766-423b-8ce1-4198c5043042	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p042	Melanotan II 10mg	1.00	40.00	40.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
74af5e3b-a5fb-4ecd-a0e4-3f225e277514	d9eff3e7-6d9b-4aac-a009-c49b0299b99c	p039	Epitalon 10mg	1.00	45.00	45.00	2026-03-18 20:20:08.911+00	2026-03-18 20:20:08.911+00	f
758a17cb-1138-41fa-ab67-df75f1cf6079	d9eff3e7-6d9b-4aac-a009-c49b0299b99c	p007	Tirzepatide 60mg	0.50	135.00	67.50	2026-03-18 20:20:08.911+00	2026-03-18 20:20:08.911+00	f
783246d1-b22a-4d1c-af27-df4def21790e	ece1625b-f1c1-48fc-827c-9a5978560ac7	p090	PE-22-28 10mg	0.50	70.00	35.00	2026-03-18 20:20:09.113+00	2026-03-18 20:20:09.113+00	f
7874567d-3ad3-4828-b92d-f1f70c925579	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p026	5-Amino-1MQ 50mg	1.00	75.00	75.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
7a3255ad-66ac-4d15-bdac-58128c50201e	a22f7966-b42d-4cab-81c3-c94983f0e590	p089	KLOW (TB10+BPC10+KPV10+GHK50)	1.00	160.00	160.00	2026-03-18 20:20:09.102+00	2026-03-18 20:20:09.102+00	f
7c2276ce-9007-48e7-b52c-b7dc7739a371	c67237d3-15ca-4487-b138-43c30d2e1df0	p004	Tirzepatide 20mg	1.00	85.00	85.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
7c4bf8e0-da61-447c-b605-33963e3e2840	17b2c399-9bba-4740-8b1e-751b5baaa252	p079	GHK-CU 50mg	1.00	40.00	40.00	2026-03-18 20:20:08.942+00	2026-03-18 20:20:08.942+00	f
7d641530-0275-4aef-983f-3dd95dfa3cba	f68aa4a8-ff01-405f-bcc0-963f4e8de0c7	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:08.883+00	2026-03-18 20:20:08.883+00	f
7fa8f370-53df-430e-a311-470d086b4e01	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p032	TB500 (TB4) 10mg	1.00	85.00	85.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
83fd7430-6b9a-4d94-bccc-946d42af0d7a	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p031	BPC 157 40mg	1.00	160.00	160.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
846d0b3d-25d7-4649-bdb1-fc6cab78802d	f5fb9f44-af87-40fc-b265-b91138f1f172	p052	Mots-C 20mg	0.50	95.00	47.50	2026-03-18 20:20:09.04+00	2026-03-18 20:20:09.04+00	f
85157133-dc6e-40ce-8d3b-8922af79ee9c	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p049	Tesamorelin 10mg	1.00	125.00	125.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
88ebb81a-563b-4690-8966-8a784604a536	03a194ac-176f-45d5-9f81-6a28e7f17c0c	p049	Tesamorelin 10mg	1.00	125.00	125.00	2026-03-18 20:20:09.035+00	2026-03-18 20:20:09.035+00	f
8bc8ee9f-0dde-4345-977d-fc441db95371	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p019	BAC water 10ml	2.00	25.00	50.00	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
8cf64259-631a-473e-93a5-e71e30d95d3c	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p123	BPC 157 500mcg Tablets	1.00	55.00	55.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
8eb0bc54-5eb5-4492-8a5f-af7f40603509	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p011	Retatrutide 30mg	3.00	155.00	465.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
918c05a8-6fb0-4b25-aae6-3c3873e5c67a	17b2c399-9bba-4740-8b1e-751b5baaa252	p089	KLOW (TB10+BPC10+KPV10+GHK50)	0.50	160.00	80.00	2026-03-18 20:20:08.942+00	2026-03-18 20:20:08.942+00	f
93266f18-1688-4af2-8523-8cd6a1de4439	fb87ced5-8e31-4eaf-a3cd-64cba23b3188	p012	Retatrutide 40mg	2.00	165.00	330.00	2026-03-18 20:20:08.924+00	2026-03-18 20:20:08.924+00	f
93a29017-8ee4-4e0e-ac96-443dff1326af	83a3d960-ba23-47a3-883c-ed6883ab9d27	p012	Retatrutide 40mg	2.00	165.00	330.00	2026-03-18 20:20:09.071+00	2026-03-18 20:20:09.071+00	f
944c6819-dd48-4390-a859-9cd87f2a848d	3b7280a7-b855-489a-b9d1-b2f03e5f3d0b	p051	Mots-C 10mg	1.00	55.00	55.00	2026-03-18 20:20:09.051+00	2026-03-18 20:20:09.051+00	f
94d844e8-d6ac-44f5-be03-f7877ed4a064	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
954155c8-bd14-4ba7-b09c-9f42adb932b3	208c5098-466d-41e8-9f75-0218fbf1db3f	p026	5-Amino-1MQ 50mg	5.00	75.00	375.00	2026-03-18 20:20:09.013+00	2026-03-18 20:20:09.013+00	f
955e7ade-bd21-4656-80a2-720f39f892c1	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p079	GHK-CU 50mg	1.00	40.00	40.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
97d57a13-dcf5-4a55-b17e-fcfd6e9daac5	c0a3135e-928e-4285-8916-e1f7ed71e04b	p072	BPC 10mg / TB4 10mg Blend	1.00	135.00	135.00	2026-03-18 20:20:08.917+00	2026-03-18 20:20:08.917+00	f
9e403f54-0e8a-4303-95a1-8766629c8c46	83a3d960-ba23-47a3-883c-ed6883ab9d27	p042	Melanotan II 10mg	1.00	40.00	40.00	2026-03-18 20:20:09.071+00	2026-03-18 20:20:09.071+00	f
a2940f8c-aa51-4b05-befe-a6e8bbccd181	3b7280a7-b855-489a-b9d1-b2f03e5f3d0b	p109	Cartalax 20mg	1.00	120.00	120.00	2026-03-18 20:20:09.051+00	2026-03-18 20:20:09.051+00	f
a4ec4060-66cd-4b3c-9e70-d6f481d032fb	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p049	Tesamorelin 10mg	1.00	125.00	125.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
a509cc59-36d7-40bb-b42c-615eaf034766	17b2c399-9bba-4740-8b1e-751b5baaa252	p006	Tirzepatide 45mg	1.00	115.00	115.00	2026-03-18 20:20:08.942+00	2026-03-18 20:20:08.942+00	f
a6f8bdc5-ba4f-48d1-8766-97c02a94aa2c	d25da38b-20aa-40ff-ba34-e1638b380836	p014	Cagrilintide 5mg	0.50	90.00	45.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
a7db29e4-90d7-49ec-96f7-7d055e648f9b	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p053	Mots-C 40mg	1.00	160.00	160.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
a91f7909-ef84-4699-8ed2-753709de49fc	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p067	Oxytocin 10mg (<99)	1.00	60.00	60.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
a9a650e4-058f-44e0-b639-6b833476eea5	b3a84822-5580-47c7-bfe0-7b61f1908c05	p003	Tirzepatide 15mg	1.00	80.00	80.00	2026-03-19 17:01:58.219+00	2026-03-19 17:01:58.219+00	f
ad3c53c6-dad3-4722-8bb2-9c0ade59309f	b096c66d-5870-4010-9511-45e13727908c	p019	BAC water 10ml	3.00	25.00	75.00	2026-03-18 20:20:08.995+00	2026-03-18 20:20:08.995+00	f
ae9a0b32-7b03-4d6b-8bb4-8dd0af82a0bd	b3a84822-5580-47c7-bfe0-7b61f1908c05	p004	Tirzepatide 20mg	0.50	85.00	42.50	2026-03-19 17:01:58.219+00	2026-03-19 17:01:58.219+00	f
b6bfb637-30bb-4e5b-b7c6-2daaa13c9699	f68aa4a8-ff01-405f-bcc0-963f4e8de0c7	p109	Cartalax 20mg	1.50	120.00	180.00	2026-03-18 20:20:08.883+00	2026-03-18 20:20:08.883+00	f
b7a0f4e0-4502-4f2c-a936-b03b820ee04e	d25da38b-20aa-40ff-ba34-e1638b380836	p021	BAC water 3ml	3.00	15.00	45.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
b87241c2-7953-47fc-8beb-146c75203367	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p008	Tirzepatide 100mg	1.00	220.00	220.00	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
befb8340-265b-4cc0-bdf7-4608633e239d	c675f7ec-5f9d-436a-afbd-fff7a1d4621a	p076	Tesa 10mg / Ipa 3mg Blend	1.00	165.00	165.00	2026-03-18 20:20:08.965+00	2026-03-18 20:20:08.965+00	f
c11a01e6-ffbf-4cc4-ba22-3c773505cb1c	c67237d3-15ca-4487-b138-43c30d2e1df0	p019	BAC water 10ml	1.00	25.00	25.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
c1f91a21-76ed-4bdb-8f50-64408cee2c10	1b975899-08c0-439c-b0bb-b65f0092d0aa	p062	Selank 10mg	1.00	55.00	55.00	2026-03-18 20:20:08.954+00	2026-03-18 20:20:08.954+00	f
c4b7bd2e-a796-4754-beb8-dbf38afe4a7e	f5fb9f44-af87-40fc-b265-b91138f1f172	p055	SS-31 30mg	0.50	155.00	77.50	2026-03-18 20:20:09.04+00	2026-03-18 20:20:09.04+00	f
c55b6727-95dd-4d29-a2fe-b90f74fc3a4a	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p055	SS-31 30mg	1.00	155.00	155.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
c65644f8-2054-40d0-872e-d92cc7d8fbf7	1b975899-08c0-439c-b0bb-b65f0092d0aa	p090	PE-22-28 10mg	1.00	70.00	70.00	2026-03-18 20:20:08.954+00	2026-03-18 20:20:08.954+00	f
c74a1076-84f6-41f3-8625-5105daff5647	bfd2166a-c2df-46bd-a127-570af936afc7	p046	Tesa / IPA / CJC No DAC 6/3/3mg	2.00	130.00	260.00	2026-03-18 20:20:08.983+00	2026-03-18 20:20:08.983+00	f
c9c8bda6-1c62-4c02-8057-8493876413e9	d25da38b-20aa-40ff-ba34-e1638b380836	p089	KLOW (TB10+BPC10+KPV10+GHK50)	0.50	160.00	80.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
cc875248-3c48-420e-ac31-2f53957d2e0a	d25da38b-20aa-40ff-ba34-e1638b380836	p085	KPV 30mg	0.50	145.00	72.50	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
cfda829d-bc71-40f7-87b3-36ccbd1a20cd	c67237d3-15ca-4487-b138-43c30d2e1df0	p054	SS-31 10mg	1.00	75.00	75.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
d0e1abbb-95bd-415e-aecb-909d68373174	17b2c399-9bba-4740-8b1e-751b5baaa252	p010	Retatrutide 20mg	3.00	120.00	360.00	2026-03-18 20:20:08.942+00	2026-03-18 20:20:08.942+00	f
d16aa82d-4929-4c7f-9902-2d0036735250	c67237d3-15ca-4487-b138-43c30d2e1df0	p068	Snap-8 10mg	1.00	40.00	40.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
d18053b9-21f8-4683-b213-d65d8b44f141	c0a3135e-928e-4285-8916-e1f7ed71e04b	p126	Orforglipron 12mg	1.00	130.00	130.00	2026-03-18 20:20:08.917+00	2026-03-18 20:20:08.917+00	f
d1d90f08-f521-4028-a09e-c163006263c6	e00b0557-6024-42ab-826c-31d5da1e3674	p024	HGH 10IU	1.00	50.00	50.00	2026-03-18 20:20:09.091+00	2026-03-18 20:20:09.091+00	f
d1e6115c-37e1-4402-b090-6887f2bffc8c	3b7280a7-b855-489a-b9d1-b2f03e5f3d0b	p030	BPC 157 10mg	1.00	45.00	45.00	2026-03-18 20:20:09.051+00	2026-03-18 20:20:09.051+00	f
d1ee2543-b10f-4533-a269-b35ae42e070c	9ece120d-7dbc-4009-ae0c-658d3d58b3d5	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:09.057+00	2026-03-18 20:20:09.057+00	f
d250f872-21ae-4a0a-aac3-f6e1fecfd59d	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p036	Fragment 176-191 5mg	1.00	75.00	75.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
d32ef927-053a-42d9-a837-ddeda278fac9	83a3d960-ba23-47a3-883c-ed6883ab9d27	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:09.071+00	2026-03-18 20:20:09.071+00	f
d81e5e73-4c39-4782-9ca6-a395cc516d30	7522e0b8-cf16-40ef-aff9-9b3180098433	p019	BAC water 10ml	1.00	25.00	25.00	2026-03-18 20:20:09.018+00	2026-03-18 20:20:09.018+00	f
da05a714-7aa6-4f48-b89f-ea95000bbb5f	a434d697-4ad9-481d-8b13-74d343cd9590	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:09.081+00	2026-03-18 20:20:09.081+00	f
dec28f3e-f161-42d6-96d1-d2906ec4ed43	d9eff3e7-6d9b-4aac-a009-c49b0299b99c	p005	Tirzepatide 30mg	1.00	90.00	90.00	2026-03-18 20:20:08.911+00	2026-03-18 20:20:08.911+00	f
e00537ac-ad5a-4b2f-b4d9-5831c512f4d6	fff847e8-871c-423b-86c5-eddea6dfe217	p013	Retatrutide 50mg	2.00	205.00	410.00	2026-03-18 20:20:08.936+00	2026-03-18 20:20:08.936+00	f
e010074b-c51b-4b47-9081-dce4bccb89e3	a22f7966-b42d-4cab-81c3-c94983f0e590	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:09.102+00	2026-03-18 20:20:09.102+00	f
e1df1e8a-85a2-441e-aef1-a62ab01f6f29	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p051	Mots-C 10mg	1.00	55.00	55.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
e417badd-677e-4ca9-82a1-9db38896f485	d25da38b-20aa-40ff-ba34-e1638b380836	p042	Melanotan II 10mg	1.00	40.00	40.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
e4611f37-a713-4cf5-a0df-c8d59e8553db	0581d320-40f1-40e7-9adb-cd05ffaabda1	p106	Vesugen 20mg	1.00	120.00	120.00	2026-03-18 20:20:09.024+00	2026-03-18 20:20:09.024+00	f
e4e7f8f8-ed4a-473b-bf53-5e836cb66029	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p006	Tirzepatide 45mg	1.00	115.00	115.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
e67e0821-3cf1-46a7-946c-1c0b72c308d2	6f6de2e0-09fd-4ba9-a538-07683263fd23	p011	Retatrutide 30mg	2.00	155.00	310.00	2026-03-19 15:35:27.558+00	2026-03-19 15:35:27.558+00	f
e7fb87d0-b18b-4b50-915c-33c19c0c11fd	7c4198b0-56ca-4561-a79e-9b04debe3cf9	p003	Tirzepatide 15mg	1.00	80.00	80.00	2026-03-19 17:02:22.408+00	2026-03-19 17:02:22.408+00	f
e8002e9d-0d34-4421-889d-cf37e568ccec	c67237d3-15ca-4487-b138-43c30d2e1df0	p005	Tirzepatide 30mg	1.00	90.00	90.00	2026-03-18 20:20:08.877+00	2026-03-18 20:20:08.877+00	f
ec7ee4fb-8cd9-4483-b0ce-5e36759b028f	b0ca116d-aaea-4b84-9ae0-8cac8ad64280	p052	Mots-C 20mg	1.00	95.00	95.00	2026-03-18 20:20:09.097+00	2026-03-18 20:20:09.097+00	f
ed15f7e7-bb36-4987-b687-41a70709d565	7d6339fe-0e7e-4f13-a613-9964a321e863	p119	GHK-CU 10g Raw	1.00	85.00	85.00	2026-03-18 20:20:09.086+00	2026-03-18 20:20:09.086+00	f
f026ec8c-bc6a-4dd9-b16b-087a9407fd86	3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	p012	Retatrutide 40mg	2.00	165.00	330.00	2026-03-18 20:20:08.891+00	2026-03-18 20:20:08.891+00	f
f3ca65c8-340b-44c7-a344-3d2f199d752c	af9e5b89-b039-4746-93be-5e2c9cf2dddd	p078	GHK-CU 100mg	1.00	51.00	51.00	2026-03-18 20:20:09.007+00	2026-03-18 20:20:09.007+00	f
f3fbba4f-7b22-49db-961c-4b28a2d8fa63	cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	p061	Semax 10mg	0.50	55.00	27.50	2026-03-18 20:20:09.029+00	2026-03-18 20:20:09.029+00	f
f4370256-1043-4069-9acd-cb632beedc90	fff847e8-871c-423b-86c5-eddea6dfe217	p014	Cagrilintide 5mg	1.00	90.00	90.00	2026-03-18 20:20:08.936+00	2026-03-18 20:20:08.936+00	f
f625774e-90be-4121-814e-39a14a04ac60	bfd2166a-c2df-46bd-a127-570af936afc7	p050	Tesamorelin 20mg	1.00	220.00	220.00	2026-03-18 20:20:08.983+00	2026-03-18 20:20:08.983+00	f
f9458a5e-5d45-4d47-b665-f725f9f5c00a	7522e0b8-cf16-40ef-aff9-9b3180098433	p012	Retatrutide 40mg	1.00	165.00	165.00	2026-03-18 20:20:09.018+00	2026-03-18 20:20:09.018+00	f
fc2c18a1-e553-4b40-96b8-8f82e1b0adbe	8fee86d5-5f56-462a-bc6f-354c2bcdc90e	p030	BPC 157 10mg	1.00	45.00	45.00	2026-03-18 20:20:08.973+00	2026-03-18 20:20:08.973+00	f
fe14de42-20d7-45d8-bdae-e8a9077c618e	1b975899-08c0-439c-b0bb-b65f0092d0aa	p061	Semax 10mg	1.00	55.00	55.00	2026-03-18 20:20:08.954+00	2026-03-18 20:20:08.954+00	f
fe5c45ec-e5bf-4c9c-ac53-114322afcb86	d25da38b-20aa-40ff-ba34-e1638b380836	p007	Tirzepatide 60mg	1.00	135.00	135.00	2026-03-18 20:20:08.989+00	2026-03-18 20:20:08.989+00	f
fe6938ae-f327-4929-8618-851d64fe2764	83a3d960-ba23-47a3-883c-ed6883ab9d27	p028	Adipotide 10mg	1.00	165.00	165.00	2026-03-18 20:20:09.071+00	2026-03-18 20:20:09.071+00	f
10d671ab-e4ad-49fd-92f1-3f735ca4e54c	7c8bddfd-8987-4ecf-a7be-0b60c92d42c4	p077	AHK-CU 100mg	1.00	60.00	60.00	2026-04-12 09:16:07.897886+00	2026-04-12 09:16:07.897886+00	f
5fe2951b-e6ad-4783-bc78-a5458c5e7533	e534aa02-2195-4922-8bda-08cdbe653ff6	p026	5-Amino-1MQ 50mg	1.00	75.00	75.00	2026-04-12 21:19:09.990213+00	2026-04-12 21:19:09.990213+00	f
9c5befb4-f3e3-41c3-9e4c-3764d429c2c3	969c8c22-29f2-40d2-b33a-7d7fa1a04798	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 11:51:33.914955+00	2026-04-13 11:51:33.914955+00	f
d205e462-ceef-467f-bb70-afe7b033b127	f067c5b6-6591-4ee1-80a4-ed63d7f43362	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 12:08:44.591368+00	2026-04-13 12:08:44.591368+00	f
5bcce117-704c-44b9-8d15-85fb452cb2f6	7d49bc59-9e38-4bde-b455-148f1ad3556b	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 12:15:07.679083+00	2026-04-13 12:15:07.679083+00	f
df3d526d-b86d-49c3-a0e2-086dc01010f4	db7ba2b4-98ad-4bd8-9d3f-ceaab226ebac	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 13:36:31.915704+00	2026-04-13 13:36:31.915704+00	f
af93ea5f-a64c-4066-aca2-ff9001d13666	c047a49e-3cb4-42d3-9cb6-9db6491d2c1d	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 13:37:36.037112+00	2026-04-13 13:37:36.037112+00	f
dd100e57-4d02-4eba-98b9-c0247f4f1451	2b8de0ea-3aee-48e6-85b5-f7ee9614c9b8	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 14:25:12.557481+00	2026-04-13 14:25:12.557481+00	f
a1fb2f57-4207-47f7-b3ac-daadfd7d7f16	bdf040f5-8334-4cbd-bdaa-284207f7acc0	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 18:12:25.655462+00	2026-04-13 18:12:25.655462+00	f
0d3a62e0-d60c-4c20-b125-2f82a0f5db9c	ab6b611e-bd4e-4781-a166-4411b4eae9be	prod-a99cdfc0	Convipen	1.00	8.00	8.00	2026-04-13 19:10:29.495543+00	2026-04-13 19:10:29.495543+00	f
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, code, telegram_username, delivery_method, delivery_method_id, delivery_price, vendor_shipping, product_subtotal, tip, grand_total, notes, status, admin_notes, admin_message, tracking_number, payment_status, payment_tx_hash, payment_test_amount, test_payment_tx_hash, shipping_name, shipping_address, pin, inpost_qr_code, created_at, updated_at, group_buy_id, testing_contribution, test_vote, refund_status, refund_reason, refunded_at, payment_rejection_reason) FROM stdin;
03a194ac-176f-45d5-9f81-6a28e7f17c0c	0027	@S S C	InPost	dm-inpost	3.00	0.00	491.00	0.00	494.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.032+00	2026-03-18 20:20:09.032+00	\N	0.00	\N	\N	\N	\N	\N
0581d320-40f1-40e7-9adb-cd05ffaabda1	0025	Fergus	Royal Mail	dm-royal-mail	10.00	0.00	480.00	0.00	490.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.021+00	2026-03-18 20:20:09.021+00	\N	0.00	\N	\N	\N	\N	\N
05edc6e3-04b1-4487-bdda-898348202bfb	0035	@hotlinerider	Royal Mail	dm-royal-mail	10.00	0.00	575.00	0.00	585.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.074+00	2026-03-18 20:20:09.074+00	\N	0.00	\N	\N	\N	\N	\N
17b2c399-9bba-4740-8b1e-751b5baaa252	0011	@J4mes_R	Royal Mail	dm-royal-mail	10.00	0.00	717.50	0.00	727.50	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.94+00	2026-03-18 20:20:08.94+00	\N	0.00	\N	\N	\N	\N	\N
1b975899-08c0-439c-b0bb-b65f0092d0aa	0013	@zebble76	Royal Mail	dm-royal-mail	10.00	0.00	180.00	0.00	190.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.951+00	2026-03-18 20:20:08.951+00	\N	0.00	\N	\N	\N	\N	\N
208c5098-466d-41e8-9f75-0218fbf1db3f	0023	@JB Adipo	InPost	dm-inpost	3.00	0.00	450.00	0.00	453.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.01+00	2026-03-18 20:20:09.01+00	\N	0.00	\N	\N	\N	\N	\N
3a5df063-138c-4498-bef2-6d733ca93ea2	0009	@jakeh1992	Royal Mail	dm-royal-mail	10.00	0.00	195.00	0.00	205.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.927+00	2026-03-18 20:20:08.927+00	\N	0.00	\N	\N	\N	\N	\N
3b7280a7-b855-489a-b9d1-b2f03e5f3d0b	0030	@josie_uk	Royal Mail	dm-royal-mail	10.00	0.00	220.00	0.00	230.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.048+00	2026-03-18 20:20:09.048+00	\N	0.00	\N	\N	\N	\N	\N
3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4	0003	UntamedChazy	Royal Mail	dm-royal-mail	10.00	0.00	930.00	0.00	940.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.887+00	2026-03-18 20:20:08.887+00	\N	0.00	\N	\N	\N	\N	\N
3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1	0042	Leonidas	Royal Mail	dm-royal-mail	10.00	0.00	435.00	0.00	445.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.105+00	2026-03-18 20:20:09.105+00	\N	0.00	\N	\N	\N	\N	\N
6f6de2e0-09fd-4ba9-a538-07683263fd23	0017	Scott	Royal Mail	dm-royal-mail	10.00	0.00	310.00	0.00	320.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.976+00	2026-03-19 15:35:27.734+00	\N	0.00	\N	\N	\N	\N	\N
7522e0b8-cf16-40ef-aff9-9b3180098433	0024	@ADev81	Royal Mail	dm-royal-mail	10.00	0.00	325.00	0.00	335.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.016+00	2026-03-18 20:20:09.016+00	\N	0.00	\N	\N	\N	\N	\N
7c4198b0-56ca-4561-a79e-9b04debe3cf9	3733	@wefewfwf	Royal Mail	dm-royal-mail	10.00	0.00	80.00	0.00	90.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-19 17:02:22.401+00	2026-03-19 17:02:22.401+00	\N	0.00	\N	\N	\N	\N	\N
7d6339fe-0e7e-4f13-a613-9964a321e863	0037	FBX2000	Royal Mail	dm-royal-mail	0.00	0.00	85.00	0.00	85.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.084+00	2026-03-18 20:20:09.084+00	\N	0.00	\N	\N	\N	\N	\N
813442f1-cfc6-45bc-9a82-3d1a63068328	0029	@noshoesnoservice	InPost	dm-inpost	3.00	0.00	160.00	0.00	163.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.043+00	2026-03-18 20:20:09.043+00	\N	0.00	\N	\N	\N	\N	\N
83a3d960-ba23-47a3-883c-ed6883ab9d27	0034	@Jayjo8	Royal Mail	dm-royal-mail	10.00	0.00	751.00	0.00	761.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.069+00	2026-03-18 20:20:09.069+00	\N	0.00	\N	\N	\N	\N	\N
872ee5ff-b754-4068-ad98-c7c06c86e42d	0033	Lizzie2391	Royal Mail	dm-royal-mail	10.00	0.00	135.00	0.00	145.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.065+00	2026-03-18 20:20:09.065+00	\N	0.00	\N	\N	\N	\N	\N
8fee86d5-5f56-462a-bc6f-354c2bcdc90e	0016	@kenupfront	Royal Mail	dm-royal-mail	10.00	0.00	1876.00	0.00	1886.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.968+00	2026-03-18 20:20:08.968+00	\N	0.00	\N	\N	\N	\N	\N
9ece120d-7dbc-4009-ae0c-658d3d58b3d5	0031	@Nemo	Royal Mail	dm-royal-mail	0.00	0.00	121.00	0.00	121.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.054+00	2026-03-18 20:20:09.054+00	\N	0.00	\N	\N	\N	\N	\N
a22f7966-b42d-4cab-81c3-c94983f0e590	0040	Shaida Ali	Royal Mail	dm-royal-mail	10.00	0.00	431.00	0.00	441.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.1+00	2026-03-18 20:20:09.1+00	\N	0.00	\N	\N	\N	\N	\N
a434d697-4ad9-481d-8b13-74d343cd9590	0036	@Zii	Royal Mail	dm-royal-mail	10.00	0.00	51.00	0.00	61.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.079+00	2026-03-18 20:20:09.079+00	\N	0.00	\N	\N	\N	\N	\N
a4cab9d2-7cb6-4f24-baa6-208f41bad4ca	0005	finguk	Royal Mail	dm-royal-mail	10.00	0.00	95.00	0.00	105.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.903+00	2026-03-18 20:20:08.903+00	\N	0.00	\N	\N	\N	\N	\N
af9e5b89-b039-4746-93be-5e2c9cf2dddd	0022	Mand	Royal Mail	dm-royal-mail	10.00	0.00	1231.00	0.00	1241.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.003+00	2026-03-18 20:20:09.003+00	\N	0.00	\N	\N	\N	\N	\N
b096c66d-5870-4010-9511-45e13727908c	0020	OJ	Royal Mail	dm-royal-mail	10.00	0.00	250.00	0.00	260.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.991+00	2026-03-18 20:20:08.991+00	\N	0.00	\N	\N	\N	\N	\N
b0ca116d-aaea-4b84-9ae0-8cac8ad64280	0039	@vasendak	Royal Mail	dm-royal-mail	10.00	0.00	165.00	0.00	175.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.094+00	2026-03-18 20:20:09.094+00	\N	0.00	\N	\N	\N	\N	\N
b3a84822-5580-47c7-bfe0-7b61f1908c05	8148	@5egergfr	Royal Mail	dm-royal-mail	10.00	0.00	122.50	0.00	132.50	\N	Submitted	\N	does this work	\N	unpaid	\N	\N	\N	\N	\N	1786	\N	2026-03-19 17:00:15.099+00	2026-03-19 17:02:08.563+00	\N	0.00	\N	\N	\N	\N	\N
bb1c75a0-a705-4887-9f13-38ed114c6af3	2164	@entangledpep	Royal Mail	dm-royal-mail	10.00	0.00	85.00	0.00	95.00	\N	Submitted	\N	\N	\N	confirmed	0x551253d4667ab3dfb6736686c8599a6102166cb847b851d62e797287df0dfcf1	\N	\N	\N	\N	0123	\N	2026-03-18 22:19:09.278+00	2026-03-18 23:17:30.914+00	\N	0.00	\N	\N	\N	\N	\N
bfd2166a-c2df-46bd-a127-570af936afc7	0018	Scottish_Basdurt	Royal Mail	dm-royal-mail	10.00	0.00	480.00	0.00	490.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.981+00	2026-03-18 20:20:08.981+00	\N	0.00	\N	\N	\N	\N	\N
c0a3135e-928e-4285-8916-e1f7ed71e04b	0007	@JohnnyWalker70	Royal Mail	dm-royal-mail	10.00	0.00	755.00	0.00	765.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.914+00	2026-03-18 20:20:08.914+00	\N	0.00	\N	\N	\N	\N	\N
c310cffd-47c0-4225-ade9-62923897b77f	0004	1poundfish	Royal Mail	dm-royal-mail	10.00	0.00	205.00	0.00	215.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.895+00	2026-03-18 20:20:08.895+00	\N	0.00	\N	\N	\N	\N	\N
c67237d3-15ca-4487-b138-43c30d2e1df0	0001	@Reeper90	Royal Mail	dm-royal-mail	10.00	0.00	1120.00	0.00	1130.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.872+00	2026-03-18 20:20:08.872+00	\N	0.00	\N	\N	\N	\N	\N
c675f7ec-5f9d-436a-afbd-fff7a1d4621a	0015	@OC1313	Royal Mail	dm-royal-mail	10.00	0.00	165.00	0.00	175.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.962+00	2026-03-18 20:20:08.962+00	\N	0.00	\N	\N	\N	\N	\N
cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca	0026	mick	Royal Mail	dm-royal-mail	10.00	0.00	445.00	0.00	455.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.027+00	2026-03-18 20:20:09.027+00	\N	0.00	\N	\N	\N	\N	\N
d25da38b-20aa-40ff-ba34-e1638b380836	0019	Pink ladybug	Royal Mail	dm-royal-mail	10.00	0.00	1282.50	0.00	1292.50	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.986+00	2026-03-18 20:20:08.986+00	\N	0.00	\N	\N	\N	\N	\N
d9eff3e7-6d9b-4aac-a009-c49b0299b99c	0006	@slimsimma	Royal Mail	dm-royal-mail	0.00	0.00	202.50	0.00	202.50	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.909+00	2026-03-18 20:20:08.909+00	\N	0.00	\N	\N	\N	\N	\N
e00b0557-6024-42ab-826c-31d5da1e3674	0038	@K_andL	Royal Mail	dm-royal-mail	10.00	0.00	75.00	0.00	85.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.089+00	2026-03-18 20:20:09.089+00	\N	0.00	\N	\N	\N	\N	\N
e8b38f59-85d4-4c03-9581-eca90f3bf35f	0021	@HAGRIDV99	Royal Mail	dm-royal-mail	10.00	0.00	185.00	0.00	195.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.998+00	2026-03-18 20:20:08.998+00	\N	0.00	\N	\N	\N	\N	\N
ece1625b-f1c1-48fc-827c-9a5978560ac7	0043	Clarke	Royal Mail	dm-royal-mail	0.00	0.00	35.00	0.00	35.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.11+00	2026-03-18 20:20:09.11+00	\N	0.00	\N	\N	\N	\N	\N
ed8e0967-57d6-421d-906e-8ca68e8cc3ba	0032	@NeverEvenSeenIt	Royal Mail	dm-royal-mail	10.00	0.00	160.00	0.00	170.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.059+00	2026-03-18 20:20:09.059+00	\N	0.00	\N	\N	\N	\N	\N
f390e78f-35ca-4021-a236-a0c36532a061	0012	@JBonwards	InPost	dm-inpost	3.00	0.00	120.00	0.00	123.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.946+00	2026-03-18 20:20:08.946+00	\N	0.00	\N	\N	\N	\N	\N
f5fb9f44-af87-40fc-b265-b91138f1f172	0028	@John Blair	InPost	dm-inpost	3.00	0.00	125.00	0.00	128.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:09.038+00	2026-03-18 20:20:09.038+00	\N	0.00	\N	\N	\N	\N	\N
f68aa4a8-ff01-405f-bcc0-963f4e8de0c7	0002	mIRCulina	Royal Mail	dm-royal-mail	10.00	0.00	231.00	0.00	241.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.881+00	2026-03-18 20:20:08.881+00	\N	0.00	\N	\N	\N	\N	\N
f7a805fd-f97e-4689-a011-2737dadc372f	0014	@T86102023	InPost	dm-inpost	3.00	0.00	95.00	0.00	98.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.957+00	2026-03-18 20:20:08.957+00	\N	0.00	\N	\N	\N	\N	\N
fb87ced5-8e31-4eaf-a3cd-64cba23b3188	0008	Prem	Royal Mail	dm-royal-mail	0.00	0.00	863.00	0.00	863.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.92+00	2026-03-18 20:20:08.92+00	\N	0.00	\N	\N	\N	\N	\N
fff847e8-871c-423b-86c5-eddea6dfe217	0010	@Jack3797	Royal Mail	dm-royal-mail	0.00	0.00	551.00	0.00	551.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-03-18 20:20:08.933+00	2026-03-18 20:20:08.933+00	\N	0.00	\N	\N	\N	\N	\N
7c8bddfd-8987-4ecf-a7be-0b60c92d42c4	7286	@testing1	Royal Mail	dm-royal-mail	10.00	5.00	60.00	0.00	75.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-12 09:16:07.864603+00	2026-04-12 09:16:07.864603+00	1794d939-ca34-40f9-b2e0-d6777482f040	0.00	\N	\N	\N	\N	\N
e534aa02-2195-4922-8bda-08cdbe653ff6	3341	@penman123	Royal Mail	dm-royal-mail	10.00	5.00	75.00	0.00	105.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-12 21:19:09.969506+00	2026-04-12 21:19:09.969506+00	H64PT	15.00	\N	\N	\N	\N	\N
969c8c22-29f2-40d2-b33a-7d7fa1a04798	2164	@iam0121	Royal Mail	ship-1776081067983	5.00	5.00	8.00	0.00	18.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-13 11:51:33.907442+00	2026-04-13 11:51:33.907442+00	P43JH	0.00	\N	\N	\N	\N	\N
f067c5b6-6591-4ee1-80a4-ed63d7f43362	8362	@iam0121	Royal Mail	ship-1776081067983	0.00	5.00	8.00	0.00	13.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-13 12:08:44.587175+00	2026-04-13 12:08:44.587175+00	P43JH	0.00	\N	\N	\N	\N	\N
7d49bc59-9e38-4bde-b455-148f1ad3556b	4547	@iam0121	Royal Mail	ship-1776081067983	0.00	5.00	8.00	0.00	13.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-13 12:15:07.673432+00	2026-04-13 12:15:07.673432+00	P43JH	0.00	\N	\N	\N	\N	\N
db7ba2b4-98ad-4bd8-9d3f-ceaab226ebac	3714	@iam0121	Royal Mail	ship-1776081067983	0.00	5.00	8.00	0.00	13.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-13 13:36:31.911779+00	2026-04-13 13:36:31.911779+00	P43JH	0.00	\N	\N	\N	\N	\N
c047a49e-3cb4-42d3-9cb6-9db6491d2c1d	7176	@iam0121	Royal Mail	ship-1776081067983	0.00	5.00	8.00	0.00	13.00	\N	Submitted	\N	\N	\N	test_ready	\N	1.94	\N	\N	\N	0000	\N	2026-04-13 13:37:36.02468+00	2026-04-13 14:23:27.051+00	P43JH	0.00	\N	\N	\N	\N	\N
2b8de0ea-3aee-48e6-85b5-f7ee9614c9b8	8316	@iam0121	Royal Mail	ship-1776081067983	0.00	5.00	8.00	0.00	13.00	\N	Submitted	\N	\N	\N	test_confirmed	\N	1.47	0xc23c02bdb5d5b10cb22437739f90924b6bc4bfacc072ca2e89c3384f2aae1505	\N	\N	0000	\N	2026-04-13 14:25:12.552919+00	2026-04-13 14:31:34.954+00	P43JH	0.00	\N	\N	\N	\N	\N
bdf040f5-8334-4cbd-bdaa-284207f7acc0	2013	@iam0121	Royal Mail	ship-1776081067983	0.00	0.00	8.00	0.00	8.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-13 18:12:25.650463+00	2026-04-13 18:12:25.650463+00	P43JH	0.00	\N	\N	\N	\N	\N
ab6b611e-bd4e-4781-a166-4411b4eae9be	6726	@iam0121	Royal Mail	ship-1776081067983	0.00	0.00	8.00	0.00	8.00	\N	Submitted	\N	\N	\N	unpaid	\N	\N	\N	\N	\N	0000	\N	2026-04-13 19:10:29.491284+00	2026-04-13 19:10:29.491284+00	P43JH	0.00	\N	\N	\N	\N	\N
\.


--
-- Data for Name: organiser_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organiser_audit_log (id, "timestamp", admin_username, organiser_username, action_type, previous_value, new_value) FROM stdin;
\.


--
-- Data for Name: plotter_cycles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plotter_cycles (id, telegram_username, entries_json, total_weeks, updated_at) FROM stdin;
1	penman123	[]	16	2026-04-12 21:33:33.577653+00
\.


--
-- Data for Name: postage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.postage (id, name, price, active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price, active, category, sort_order, created_at, updated_at, source_group_buy_id, vendor, stock, low_stock_threshold, organiser_id, mg_size) FROM stdin;
p001	Semaglutide 10mg	55.00	t	\N	1	2026-03-18 15:19:10.669+00	2026-03-18 16:36:48.221+00	\N	Uther	\N	\N	\N	\N
p002	Tirzepatide 10mg	65.00	t	\N	2	2026-03-18 15:19:10.673+00	2026-03-18 16:36:48.224+00	\N	Uther	\N	\N	\N	\N
p003	Tirzepatide 15mg	80.00	t	\N	3	2026-03-18 15:19:10.675+00	2026-03-18 15:19:10.675+00	\N	Uther	\N	\N	\N	\N
p004	Tirzepatide 20mg	85.00	t	\N	4	2026-03-18 15:19:10.678+00	2026-03-18 15:19:10.678+00	\N	Uther	\N	\N	\N	\N
p005	Tirzepatide 30mg	90.00	t	\N	5	2026-03-18 15:19:10.682+00	2026-03-18 15:19:10.682+00	\N	Uther	\N	\N	\N	\N
p006	Tirzepatide 45mg	115.00	t	\N	6	2026-03-18 15:19:10.685+00	2026-03-18 15:19:10.685+00	\N	Uther	\N	\N	\N	\N
p007	Tirzepatide 60mg	135.00	t	\N	7	2026-03-18 15:19:10.688+00	2026-03-18 15:19:10.688+00	\N	Uther	\N	\N	\N	\N
p008	Tirzepatide 100mg	220.00	t	\N	8	2026-03-18 15:19:10.691+00	2026-03-18 15:19:10.691+00	\N	Uther	\N	\N	\N	\N
p009	Retatrutide 10mg	95.00	t	\N	9	2026-03-18 15:19:10.694+00	2026-03-18 15:19:10.694+00	\N	Uther	\N	\N	\N	\N
p010	Retatrutide 20mg	120.00	t	\N	10	2026-03-18 15:19:10.697+00	2026-03-18 15:19:10.697+00	\N	Uther	\N	\N	\N	\N
p011	Retatrutide 30mg	155.00	t	\N	11	2026-03-18 15:19:10.7+00	2026-03-18 15:19:10.7+00	\N	Uther	\N	\N	\N	\N
p012	Retatrutide 40mg	165.00	t	\N	12	2026-03-18 15:19:10.703+00	2026-03-18 15:19:10.703+00	\N	Uther	\N	\N	\N	\N
p013	Retatrutide 50mg	205.00	t	\N	13	2026-03-18 15:19:10.706+00	2026-03-18 15:19:10.706+00	\N	Uther	\N	\N	\N	\N
p014	Cagrilintide 5mg	90.00	t	\N	14	2026-03-18 15:19:10.709+00	2026-03-18 15:19:10.709+00	\N	Uther	\N	\N	\N	\N
p015	Cagrilintide 10mg	170.00	t	\N	15	2026-03-18 15:19:10.711+00	2026-03-18 15:19:10.711+00	\N	Uther	\N	\N	\N	\N
p016	Mazdutide 10mg	160.00	t	\N	16	2026-03-18 15:19:10.713+00	2026-03-18 15:19:10.713+00	\N	Uther	\N	\N	\N	\N
p017	Survodutide 10mg	170.00	t	\N	17	2026-03-18 15:19:10.716+00	2026-03-18 15:19:10.716+00	\N	Uther	\N	\N	\N	\N
p018	GAC water 10ml	25.00	t	\N	18	2026-03-18 15:19:10.719+00	2026-03-18 15:19:10.719+00	\N	Uther	\N	\N	\N	\N
p019	BAC water 10ml	25.00	t	\N	19	2026-03-18 15:19:10.721+00	2026-03-18 15:19:10.721+00	\N	Uther	\N	\N	\N	\N
p020	GAC water 3ml	15.00	t	\N	20	2026-03-18 15:19:10.724+00	2026-03-18 15:19:10.724+00	\N	Uther	\N	\N	\N	\N
p021	BAC water 3ml	15.00	t	\N	21	2026-03-18 15:19:10.727+00	2026-03-18 15:19:10.727+00	\N	Uther	\N	\N	\N	\N
p022	L-Carnitine 500mg×20ml×10vials Water	160.00	t	\N	22	2026-03-18 15:19:10.729+00	2026-03-18 15:19:10.729+00	\N	Uther	\N	\N	\N	\N
p023	Cyanocobalamin B12 1mg ×10ml×10vials water	60.00	t	\N	23	2026-03-18 15:19:10.732+00	2026-03-18 15:19:10.732+00	\N	Uther	\N	\N	\N	\N
p024	HGH 10IU	50.00	t	\N	24	2026-03-18 15:19:10.735+00	2026-03-18 15:19:10.735+00	\N	Uther	\N	\N	\N	\N
p025	IGF-1 LR3 1mg	210.00	t	\N	25	2026-03-18 15:19:10.738+00	2026-03-18 15:19:10.738+00	\N	Uther	\N	\N	\N	\N
p026	5-Amino-1MQ 50mg	75.00	t	\N	26	2026-03-18 15:19:10.74+00	2026-03-18 15:19:10.74+00	\N	Uther	\N	\N	\N	\N
p027	5-Amino-1MQ 10mg	55.00	t	\N	27	2026-03-18 15:19:10.743+00	2026-03-18 15:19:10.743+00	\N	Uther	\N	\N	\N	\N
p028	Adipotide 10mg	165.00	t	\N	28	2026-03-18 15:19:10.746+00	2026-03-18 15:19:10.746+00	\N	Uther	\N	\N	\N	\N
p029	VIP 10mg	125.00	t	\N	29	2026-03-18 15:19:10.749+00	2026-03-18 15:19:10.749+00	\N	Uther	\N	\N	\N	\N
p030	BPC 157 10mg	45.00	t	\N	30	2026-03-18 15:19:10.751+00	2026-03-18 15:19:10.751+00	\N	Uther	\N	\N	\N	\N
p031	BPC 157 40mg	160.00	t	\N	31	2026-03-18 15:19:10.754+00	2026-03-18 15:19:10.754+00	\N	Uther	\N	\N	\N	\N
p032	TB500 (TB4) 10mg	85.00	t	\N	32	2026-03-18 15:19:10.756+00	2026-03-18 15:19:10.756+00	\N	Uther	\N	\N	\N	\N
p033	TB500 (TB4) 20mg	165.00	t	\N	33	2026-03-18 15:19:10.759+00	2026-03-18 15:19:10.759+00	\N	Uther	\N	\N	\N	\N
p034	Abaloparatide 3mg	100.00	t	\N	34	2026-03-18 15:19:10.762+00	2026-03-18 15:19:10.762+00	\N	Uther	\N	\N	\N	\N
p035	Teriparatide 750mcg	75.00	t	\N	35	2026-03-18 15:19:10.765+00	2026-03-18 15:19:10.765+00	\N	Uther	\N	\N	\N	\N
p036	Fragment 176-191 5mg	75.00	t	\N	36	2026-03-18 15:19:10.773+00	2026-03-18 15:19:10.773+00	\N	Uther	\N	\N	\N	\N
p037	PT141 10mg	60.00	t	\N	37	2026-03-18 15:19:10.776+00	2026-03-18 15:19:10.776+00	\N	Uther	\N	\N	\N	\N
p038	Kisspeptin 10mg	70.00	t	\N	38	2026-03-18 15:19:10.779+00	2026-03-18 15:19:10.779+00	\N	Uther	\N	\N	\N	\N
p039	Epitalon 10mg	45.00	t	\N	39	2026-03-18 15:19:10.782+00	2026-03-18 15:19:10.782+00	\N	Uther	\N	\N	\N	\N
p040	Epitalon 50mg	200.00	t	\N	40	2026-03-18 15:19:10.784+00	2026-03-18 15:19:10.784+00	\N	Uther	\N	\N	\N	\N
p041	N-Acetyl Epitalon 20mg	110.00	t	\N	41	2026-03-18 15:19:10.787+00	2026-03-18 15:19:10.787+00	\N	Uther	\N	\N	\N	\N
p042	Melanotan II 10mg	40.00	t	\N	42	2026-03-18 15:19:10.79+00	2026-03-18 15:19:10.79+00	\N	Uther	\N	\N	\N	\N
p043	Melanotan I 10mg	50.00	t	\N	43	2026-03-18 15:19:10.792+00	2026-03-18 15:19:10.792+00	\N	Uther	\N	\N	\N	\N
p044	CJC-1295 with DAC 5mg	120.00	t	\N	44	2026-03-18 15:19:10.794+00	2026-03-18 15:19:10.794+00	\N	Uther	\N	\N	\N	\N
p045	CJC-1295 No DAC 10mg	140.00	t	\N	45	2026-03-18 15:19:10.797+00	2026-03-18 15:19:10.797+00	\N	Uther	\N	\N	\N	\N
p046	Tesa / IPA / CJC No DAC 6/3/3mg	130.00	t	\N	46	2026-03-18 15:19:10.8+00	2026-03-18 15:19:10.8+00	\N	Uther	\N	\N	\N	\N
p047	GHRP-6 10mg	50.00	t	\N	47	2026-03-18 15:19:10.802+00	2026-03-18 15:19:10.802+00	\N	Uther	\N	\N	\N	\N
p048	GHRP-2 10mg	50.00	t	\N	48	2026-03-18 15:19:10.805+00	2026-03-18 15:19:10.805+00	\N	Uther	\N	\N	\N	\N
p049	Tesamorelin 10mg	125.00	t	\N	49	2026-03-18 15:19:10.808+00	2026-03-18 15:19:10.808+00	\N	Uther	\N	\N	\N	\N
p050	Tesamorelin 20mg	220.00	t	\N	50	2026-03-18 15:19:10.811+00	2026-03-18 15:19:10.811+00	\N	Uther	\N	\N	\N	\N
p051	Mots-C 10mg	55.00	t	\N	51	2026-03-18 15:19:10.814+00	2026-03-18 15:19:10.814+00	\N	Uther	\N	\N	\N	\N
p052	Mots-C 20mg	95.00	t	\N	52	2026-03-18 15:19:10.817+00	2026-03-18 15:19:10.817+00	\N	Uther	\N	\N	\N	\N
p053	Mots-C 40mg	160.00	t	\N	53	2026-03-18 15:19:10.82+00	2026-03-18 15:19:10.82+00	\N	Uther	\N	\N	\N	\N
p054	SS-31 10mg	75.00	t	\N	54	2026-03-18 15:19:10.823+00	2026-03-18 15:19:10.823+00	\N	Uther	\N	\N	\N	\N
p055	SS-31 30mg	155.00	t	\N	55	2026-03-18 15:19:10.826+00	2026-03-18 15:19:10.826+00	\N	Uther	\N	\N	\N	\N
p056	SS-31 50mg	230.00	t	\N	56	2026-03-18 15:19:10.828+00	2026-03-18 15:19:10.828+00	\N	Uther	\N	\N	\N	\N
p057	Ipamorelin 10mg	80.00	t	\N	57	2026-03-18 15:19:10.831+00	2026-03-18 15:19:10.831+00	\N	Uther	\N	\N	\N	\N
p058	Thymosin Alpha-1 10mg	125.00	t	\N	58	2026-03-18 15:19:10.834+00	2026-03-18 15:19:10.834+00	\N	Uther	\N	\N	\N	\N
p059	Thymulin 20mg	100.00	t	\N	59	2026-03-18 15:19:10.836+00	2026-03-18 15:19:10.836+00	\N	Uther	\N	\N	\N	\N
p060	Adamax 10mg (1032 da)	250.00	t	\N	60	2026-03-18 15:19:10.838+00	2026-03-18 15:19:10.838+00	\N	Uther	\N	\N	\N	\N
p061	Semax 10mg	55.00	t	\N	61	2026-03-18 15:19:10.842+00	2026-03-18 15:19:10.842+00	\N	Uther	\N	\N	\N	\N
p062	Selank 10mg	55.00	t	\N	62	2026-03-18 15:19:10.845+00	2026-03-18 15:19:10.845+00	\N	Uther	\N	\N	\N	\N
p063	Na Semax	70.00	t	\N	63	2026-03-18 15:19:10.848+00	2026-03-18 15:19:10.848+00	\N	Uther	\N	\N	\N	\N
p064	Na Selank	70.00	t	\N	64	2026-03-18 15:19:10.851+00	2026-03-18 15:19:10.851+00	\N	Uther	\N	\N	\N	\N
p065	IllumiNeuro (PE10mg+Pinealon 10mg+Na Semax 20mg+Na Selank 8mg)	240.00	t	\N	65	2026-03-18 15:19:10.854+00	2026-03-18 15:19:10.854+00	\N	Uther	\N	\N	\N	\N
p066	Fox04 10mg	300.00	t	\N	66	2026-03-18 15:19:10.856+00	2026-03-18 15:19:10.856+00	\N	Uther	\N	\N	\N	\N
p067	Oxytocin 10mg (<99)	60.00	t	\N	67	2026-03-18 15:19:10.859+00	2026-03-18 15:19:10.859+00	\N	Uther	\N	\N	\N	\N
p068	Snap-8 10mg	40.00	t	\N	68	2026-03-18 15:19:10.862+00	2026-03-18 15:19:10.862+00	\N	Uther	\N	\N	\N	\N
p069	DSIP 5mg	35.00	t	\N	69	2026-03-18 15:19:10.865+00	2026-03-18 15:19:10.865+00	\N	Uther	\N	\N	\N	\N
p070	DSIP 10mg	65.00	t	\N	70	2026-03-18 15:19:10.868+00	2026-03-18 15:19:10.868+00	\N	Uther	\N	\N	\N	\N
p071	BPC 5mg / TB4 5mg Blend	80.00	t	\N	71	2026-03-18 15:19:10.871+00	2026-03-18 15:19:10.871+00	\N	Uther	\N	\N	\N	\N
p072	BPC 10mg / TB4 10mg Blend	135.00	t	\N	72	2026-03-18 15:19:10.874+00	2026-03-18 15:19:10.874+00	\N	Uther	\N	\N	\N	\N
p073	CJC No DAC / Ipa 5/5mg	75.00	t	\N	73	2026-03-18 15:19:10.886+00	2026-03-18 15:19:10.886+00	\N	Uther	\N	\N	\N	\N
p074	CJC 6mg / Ipa 11mg Blend	160.00	t	\N	74	2026-03-18 15:19:10.888+00	2026-03-18 15:19:10.888+00	\N	Uther	\N	\N	\N	\N
p075	Tesa 5mg / Ipa 5mg Blend	110.00	t	\N	75	2026-03-18 15:19:10.891+00	2026-03-18 15:19:10.891+00	\N	Uther	\N	\N	\N	\N
p076	Tesa 10mg / Ipa 3mg Blend	165.00	t	\N	76	2026-03-18 15:19:10.893+00	2026-03-18 15:19:10.893+00	\N	Uther	\N	\N	\N	\N
p077	AHK-CU 100mg	60.00	t	\N	77	2026-03-18 15:19:10.896+00	2026-03-18 15:19:10.896+00	\N	Uther	\N	\N	\N	\N
p078	GHK-CU 100mg	51.00	t	\N	78	2026-03-18 15:19:10.899+00	2026-03-18 15:19:10.899+00	\N	Uther	\N	\N	\N	\N
p079	GHK-CU 50mg	40.00	t	\N	79	2026-03-18 15:19:10.902+00	2026-03-18 15:19:10.902+00	\N	Uther	\N	\N	\N	\N
p080	NAD+ 500mg Buffer pH6-6.5	95.00	t	\N	80	2026-03-18 15:19:10.905+00	2026-03-18 15:19:10.905+00	\N	Uther	\N	\N	\N	\N
p081	TB500 Frag 10mg	70.00	t	\N	81	2026-03-18 15:19:10.908+00	2026-03-18 15:19:10.908+00	\N	Uther	\N	\N	\N	\N
p082	PNC 27 30mg (this batch 28mg)	240.00	t	\N	82	2026-03-18 15:19:10.91+00	2026-03-18 15:19:10.91+00	\N	Uther	\N	\N	\N	\N
p083	LL-37 5mg	85.00	t	\N	83	2026-03-18 15:19:10.913+00	2026-03-18 15:19:10.913+00	\N	Uther	\N	\N	\N	\N
p084	KPV 10mg	60.00	t	\N	84	2026-03-18 15:19:10.915+00	2026-03-18 15:19:10.915+00	\N	Uther	\N	\N	\N	\N
p085	KPV 30mg	145.00	t	\N	85	2026-03-18 15:19:10.918+00	2026-03-18 15:19:10.918+00	\N	Uther	\N	\N	\N	\N
p086	Sermorelin 5mg	70.00	t	\N	86	2026-03-18 15:19:10.921+00	2026-03-18 15:19:10.921+00	\N	Uther	\N	\N	\N	\N
p087	KPV & GHK-CU Blend	110.00	t	\N	87	2026-03-18 15:19:10.923+00	2026-03-18 15:19:10.923+00	\N	Uther	\N	\N	\N	\N
p088	GLOW (TB4 10mg + BPC 10mg + GHK 50mg)	135.00	t	\N	88	2026-03-18 15:19:10.926+00	2026-03-18 15:19:10.926+00	\N	Uther	\N	\N	\N	\N
p089	KLOW (TB 10mg + BPC 10mg + KPV 10mg + GHK 50mg)	160.00	t	\N	89	2026-03-18 15:19:10.929+00	2026-03-18 15:19:10.929+00	\N	Uther	\N	\N	\N	\N
p090	PE-22-28 10mg	70.00	t	\N	90	2026-03-18 15:19:10.931+00	2026-03-18 15:19:10.931+00	\N	Uther	\N	\N	\N	\N
p091	Ara-290 16mg	60.00	t	\N	91	2026-03-18 15:19:10.934+00	2026-03-18 15:19:10.934+00	\N	Uther	\N	\N	\N	\N
p092	Tri-Heal Max (TB4 25mg + BPC 10mg + KPV 10mg)	380.00	t	\N	92	2026-03-18 15:19:10.936+00	2026-03-18 15:19:10.936+00	\N	Uther	\N	\N	\N	\N
p093	Slup-332 500mcg	60.00	t	\N	93	2026-03-18 15:19:10.939+00	2026-03-18 15:19:10.939+00	\N	Uther	\N	\N	\N	\N
p094	Bam-15 50mg (USA — no resend)	300.00	t	\N	94	2026-03-18 15:19:10.942+00	2026-03-18 15:19:10.942+00	\N	Uther	\N	\N	\N	\N
p095	SLU 100mcg / BAM 25mg Blend 60 Tabs	95.00	t	\N	95	2026-03-18 15:19:10.944+00	2026-03-18 15:19:10.944+00	\N	Uther	\N	\N	\N	\N
p096	HCG 1000 IU GMP 3ml 10vials	40.00	t	\N	96	2026-03-18 15:19:10.946+00	2026-03-18 15:19:10.946+00	\N	Uther	\N	\N	\N	\N
p097	HCG 2000 IU GMP 3ml 10vials	70.00	t	\N	97	2026-03-18 15:19:10.95+00	2026-03-18 15:19:10.95+00	\N	Uther	\N	\N	\N	\N
p098	HCG 5000 IU GMP 3ml 10vials	175.00	t	\N	98	2026-03-18 15:19:10.952+00	2026-03-18 15:19:10.952+00	\N	Uther	\N	\N	\N	\N
p099	Glutathione 600mg GMP 10ml 10vials	45.00	t	\N	99	2026-03-18 15:19:10.955+00	2026-03-18 15:19:10.955+00	\N	Uther	\N	\N	\N	\N
p100	Glutathione 1500mg GMP 20ml 10vials	85.00	t	\N	100	2026-03-18 15:19:10.958+00	2026-03-18 15:19:10.958+00	\N	Uther	\N	\N	\N	\N
p101	HMG 75IU × 10vials GMP	75.00	t	\N	101	2026-03-18 15:19:10.961+00	2026-03-18 15:19:10.961+00	\N	Uther	\N	\N	\N	\N
p102	Cerebrolysin 30mg GMP 10ml 10vials	45.00	t	\N	102	2026-03-18 15:19:10.963+00	2026-03-18 15:19:10.963+00	\N	Uther	\N	\N	\N	\N
p103	Prostamax 20mg	120.00	t	\N	103	2026-03-18 15:19:10.966+00	2026-03-18 15:19:10.966+00	\N	Uther	\N	\N	\N	\N
p104	Pinealon 20mg	120.00	t	\N	104	2026-03-18 15:19:10.968+00	2026-03-18 15:19:10.968+00	\N	Uther	\N	\N	\N	\N
p105	Ovagen 20mg	120.00	t	\N	105	2026-03-18 15:19:10.972+00	2026-03-18 15:19:10.972+00	\N	Uther	\N	\N	\N	\N
p106	Vesugen 20mg	120.00	t	\N	106	2026-03-18 15:19:10.974+00	2026-03-18 15:19:10.974+00	\N	Uther	\N	\N	\N	\N
p107	Bronchogen 20mg	120.00	t	\N	107	2026-03-18 15:19:10.977+00	2026-03-18 15:19:10.977+00	\N	Uther	\N	\N	\N	\N
p108	Vilon 20mg	120.00	t	\N	108	2026-03-18 15:19:10.979+00	2026-03-18 15:19:10.979+00	\N	Uther	\N	\N	\N	\N
p109	Cartalax 20mg	120.00	t	\N	109	2026-03-18 15:19:10.982+00	2026-03-18 15:19:10.982+00	\N	Uther	\N	\N	\N	\N
p110	Cortagen 20mg	120.00	t	\N	110	2026-03-18 15:19:10.985+00	2026-03-18 15:19:10.985+00	\N	Uther	\N	\N	\N	\N
p111	Chonluten 20mg	120.00	t	\N	111	2026-03-18 15:19:10.988+00	2026-03-18 15:19:10.988+00	\N	Uther	\N	\N	\N	\N
p112	Livagen 20mg	120.00	t	\N	112	2026-03-18 15:19:10.991+00	2026-03-18 15:19:10.991+00	\N	Uther	\N	\N	\N	\N
p113	Testagen 20mg	120.00	t	\N	113	2026-03-18 15:19:10.994+00	2026-03-18 15:19:10.994+00	\N	Uther	\N	\N	\N	\N
p114	Cardiogen 20mg	120.00	t	\N	114	2026-03-18 15:19:10.996+00	2026-03-18 15:19:10.996+00	\N	Uther	\N	\N	\N	\N
p115	Pancragon 20mg	120.00	t	\N	115	2026-03-18 15:19:10.999+00	2026-03-18 15:19:10.999+00	\N	Uther	\N	\N	\N	\N
p116	Thymogen 20mg	120.00	t	\N	116	2026-03-18 15:19:11.002+00	2026-03-18 15:19:11.002+00	\N	Uther	\N	\N	\N	\N
p117	Crystagen 20mg	120.00	t	\N	117	2026-03-18 15:19:11.004+00	2026-03-18 15:19:11.004+00	\N	Uther	\N	\N	\N	\N
p118	Vesilute 20mg	120.00	t	\N	118	2026-03-18 15:19:11.007+00	2026-03-18 15:19:11.007+00	\N	Uther	\N	\N	\N	\N
p119	GHK-CU 10g Raw	85.00	t	\N	119	2026-03-18 15:19:11.01+00	2026-03-18 15:19:11.01+00	\N	Uther	\N	\N	\N	\N
p120	AHK-CU 10g Raw	175.00	t	\N	120	2026-03-18 15:19:11.013+00	2026-03-18 15:19:11.013+00	\N	Uther	\N	\N	\N	\N
p121	SNAP-8 1g	95.00	t	\N	121	2026-03-18 15:19:11.016+00	2026-03-18 15:19:11.016+00	\N	Uther	\N	\N	\N	\N
p122	SNAP-8 10g	785.00	t	\N	122	2026-03-18 15:19:11.018+00	2026-03-18 15:19:11.018+00	\N	Uther	\N	\N	\N	\N
p123	BPC 157 500mcg Tablets	55.00	t	\N	123	2026-03-18 15:19:11.021+00	2026-03-18 15:19:11.021+00	\N	Uther	\N	\N	\N	\N
p124	KPV 500mcg Tablets	55.00	t	\N	124	2026-03-18 15:19:11.024+00	2026-03-18 15:19:11.024+00	\N	Uther	\N	\N	\N	\N
p125	Humanin [Purity not Guaranteed]	155.00	t	\N	125	2026-03-18 15:19:11.027+00	2026-03-18 15:19:11.027+00	\N	Uther	\N	\N	\N	\N
p126	Orforglipron 12mg	130.00	t	\N	126	2026-03-18 15:19:11.03+00	2026-03-18 15:19:11.03+00	\N	Uther	\N	\N	\N	\N
prod-a99cdfc0	Convipen	8.00	t	\N	\N	2026-04-13 08:45:28.6319+00	2026-04-13 08:45:28.6319+00	P43JH	iam0121	\N	\N	iam0121	\N
\.


--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipments (id, label, carrier, tracking_number, status, status_code, origin, estimated_delivery, cached_events, last_checked, notes, active, created_at) FROM stdin;
\.


--
-- Data for Name: site_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_config (key, value, updated_at) FROM stdin;
walletAddress	0x3B5670Fe10369082297f29eB6dB950C2db7d3659	2026-03-18 17:33:51.806+00
walletChangeCodeHash	41071ea6b4245c84275a8d3de474dda11ae560f5466a9fd407525753fe257e5d	2026-03-18 17:34:11.004+00
telegramBotToken	8695162713:AAHfcEylnM2Hjvq0zeJFGKvKeLFzLppBzMs	2026-04-12 16:57:32.177+00
telegramAdminChatId	6178447383	2026-04-12 16:57:32.217+00
publicNavItems	[{"id":"shop","label":"Lonely Vial","enabled":true},{"id":"accessories","label":"Accessories","enabled":false},{"id":"lab","label":"Lab Reports","enabled":true},{"id":"protocols","label":"Protocols","enabled":true},{"id":"medications","label":"Med Protocols","enabled":true},{"id":"trtaas","label":"TRT & AAS","enabled":true},{"id":"learn","label":"Learning Hub","enabled":true},{"id":"safety","label":"Endotoxin Calc","enabled":true},{"id":"calculator","label":"Dose Calc","enabled":true}]	2026-04-12 16:58:28.156+00
track17ApiKey	129C2BA68127F22DBEABCE3F12FBFA08	2026-04-12 21:02:28.501908+00
paymentsEnabled	true	2026-04-12 21:02:57.439+00
notifications	[]	2026-04-13 14:17:10.356+00
\.


--
-- Data for Name: vial_discount_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vial_discount_codes (id, code, discount_type, discount_value, min_order_amount, max_uses, uses_count, expires_at, active, notes, created_at) FROM stdin;
\.


--
-- Data for Name: vial_manufacturers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vial_manufacturers (id, name, country, website, notes, active, created_at) FROM stdin;
\.


--
-- Data for Name: vial_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vial_order_items (id, order_id, product_id, product_name, quantity, unit_price, line_total) FROM stdin;
6d490b18-2ff0-46c8-8855-ff31f7e1c789	a2ed8926-a6b4-48e3-ad5f-fca8d547196c	621650ad-109d-460f-ad39-0821141d317a	Retatrutide 10mg	1	20.00	20.00
\.


--
-- Data for Name: vial_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vial_orders (id, code, telegram_username, shipping_name, shipping_address, email, notes, status, subtotal, discount_amount, total, discount_code_id, discount_code_used, order_status, payment_status, payment_tx_hash, wallet_address, admin_notes, created_at) FROM stdin;
a2ed8926-a6b4-48e3-ad5f-fca8d547196c	LV-MZSZCH	sleepingpep	\N	\N	\N	\N	pending	20.00	0.00	20.00	\N	\N	pending_acceptance	unpaid	\N	0x3B5670Fe10369082297f29eB6dB950C2db7d3659	\N	2026-04-11 11:50:40.08262+00
\.


--
-- Data for Name: vial_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vial_products (id, vendor_id, name, description, category, mg_size, price, currency, stock, manufacturer, batch_number, lab_report_url, image_url, active, sort_order, created_at, updated_at) FROM stdin;
621650ad-109d-460f-ad39-0821141d317a	cf9b8d99-c159-4265-9c8e-249527046501	Retatrutide 10mg	\N	Peptides	10	20.00	USDT	5	\N	32342	https://verify.janoshik.com/tests/75944-Retatrutide_10mg_26WQNEWELZ5T	\N	t	\N	2026-03-20 01:54:26.919+00	2026-03-20 01:54:26.919+00
\.


--
-- Data for Name: vial_vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vial_vendors (id, name, tagline, description, contact_telegram, telegram_chat_id, logo_url, ships_to, country, rating, seller_password_hash, wallet_address, revolut_link, paypal_link, active, sort_order, created_at, reset_code, reset_code_expires_at) FROM stdin;
cf9b8d99-c159-4265-9c8e-249527046501	Test	Test	Purely test	test	\N	https://verify.janoshik.com/tests/75944-Retatrutide_10mg_26WQNEWELZ5T	Worldwide	\N	\N	\N	\N	\N	\N	t	42	2026-03-20 01:53:58.287+00	\N	\N
aa0c2358-d0e8-4e02-9297-887c90283b54	Van	\N	\N	entangledpep	\N	\N	UK	uk	\N	bc05e0929ac362ba2ef15e6d3c252a0e4c0d81d4d964464cb69bca615e66e825	\N	\N	\N	t	\N	2026-04-11 11:53:36.479991+00	\N	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 7, true);


--
-- Name: admin_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_alerts_id_seq', 8, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 105, true);


--
-- Name: feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feedback_id_seq', 1, false);


--
-- Name: fs3_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fs3_costs_id_seq', 1, false);


--
-- Name: lab_tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_tests_id_seq', 503, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_group_buys account_group_buys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_group_buys
    ADD CONSTRAINT account_group_buys_pkey PRIMARY KEY (id);


--
-- Name: account_group_buys account_group_buys_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_group_buys
    ADD CONSTRAINT account_group_buys_unique UNIQUE (account_id, group_buy_id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (telegram_username);


--
-- Name: admin_alerts admin_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_alerts
    ADD CONSTRAINT admin_alerts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: blood_test_sessions blood_test_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blood_test_sessions
    ADD CONSTRAINT blood_test_sessions_pkey PRIMARY KEY (id);


--
-- Name: blood_test_values blood_test_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blood_test_values
    ADD CONSTRAINT blood_test_values_pkey PRIMARY KEY (id);


--
-- Name: bt_conversations bt_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bt_conversations
    ADD CONSTRAINT bt_conversations_pkey PRIMARY KEY (id);


--
-- Name: compound_logs compound_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compound_logs
    ADD CONSTRAINT compound_logs_pkey PRIMARY KEY (id);


--
-- Name: custom_couriers custom_couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_couriers
    ADD CONSTRAINT custom_couriers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (telegram_username);


--
-- Name: delivery_methods delivery_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_methods
    ADD CONSTRAINT delivery_methods_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: fs3_costs fs3_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fs3_costs
    ADD CONSTRAINT fs3_costs_pkey PRIMARY KEY (id);


--
-- Name: fs3_costs fs3_costs_product_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fs3_costs
    ADD CONSTRAINT fs3_costs_product_name_unique UNIQUE (product_name);


--
-- Name: gb_waitlist gb_waitlist_group_buy_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gb_waitlist
    ADD CONSTRAINT gb_waitlist_group_buy_id_account_id_key UNIQUE (group_buy_id, account_id);


--
-- Name: gb_waitlist gb_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gb_waitlist
    ADD CONSTRAINT gb_waitlist_pkey PRIMARY KEY (id);


--
-- Name: glp1_logs glp1_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glp1_logs
    ADD CONSTRAINT glp1_logs_pkey PRIMARY KEY (id);


--
-- Name: group_buy_delivery_methods group_buy_delivery_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_delivery_methods
    ADD CONSTRAINT group_buy_delivery_methods_pkey PRIMARY KEY (id);


--
-- Name: group_buy_delivery_methods group_buy_delivery_methods_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_delivery_methods
    ADD CONSTRAINT group_buy_delivery_methods_unique UNIQUE (group_buy_id, delivery_method_id);


--
-- Name: group_buy_products group_buy_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_products
    ADD CONSTRAINT group_buy_products_pkey PRIMARY KEY (id);


--
-- Name: group_buy_products group_buy_products_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_products
    ADD CONSTRAINT group_buy_products_unique UNIQUE (group_buy_id, product_id);


--
-- Name: group_buys group_buys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buys
    ADD CONSTRAINT group_buys_pkey PRIMARY KEY (id);


--
-- Name: lab_tests lab_tests_janoshik_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_janoshik_id_unique UNIQUE (janoshik_id);


--
-- Name: lab_tests lab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_pkey PRIMARY KEY (id);


--
-- Name: lookup_attempts lookup_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lookup_attempts
    ADD CONSTRAINT lookup_attempts_pkey PRIMARY KEY (id);


--
-- Name: order_line_items order_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: organiser_audit_log organiser_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organiser_audit_log
    ADD CONSTRAINT organiser_audit_log_pkey PRIMARY KEY (id);


--
-- Name: plotter_cycles plotter_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plotter_cycles
    ADD CONSTRAINT plotter_cycles_pkey PRIMARY KEY (id);


--
-- Name: postage postage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postage
    ADD CONSTRAINT postage_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: site_config site_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_config
    ADD CONSTRAINT site_config_pkey PRIMARY KEY (key);


--
-- Name: vial_discount_codes vial_discount_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_discount_codes
    ADD CONSTRAINT vial_discount_codes_code_unique UNIQUE (code);


--
-- Name: vial_discount_codes vial_discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_discount_codes
    ADD CONSTRAINT vial_discount_codes_pkey PRIMARY KEY (id);


--
-- Name: vial_manufacturers vial_manufacturers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_manufacturers
    ADD CONSTRAINT vial_manufacturers_pkey PRIMARY KEY (id);


--
-- Name: vial_order_items vial_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_order_items
    ADD CONSTRAINT vial_order_items_pkey PRIMARY KEY (id);


--
-- Name: vial_orders vial_orders_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_orders
    ADD CONSTRAINT vial_orders_code_unique UNIQUE (code);


--
-- Name: vial_orders vial_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_orders
    ADD CONSTRAINT vial_orders_pkey PRIMARY KEY (id);


--
-- Name: vial_products vial_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_products
    ADD CONSTRAINT vial_products_pkey PRIMARY KEY (id);


--
-- Name: vial_vendors vial_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vial_vendors
    ADD CONSTRAINT vial_vendors_pkey PRIMARY KEY (id);


--
-- Name: account_group_buys account_group_buys_account_id_accounts_telegram_username_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_group_buys
    ADD CONSTRAINT account_group_buys_account_id_accounts_telegram_username_fk FOREIGN KEY (account_id) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: account_group_buys account_group_buys_group_buy_id_group_buys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_group_buys
    ADD CONSTRAINT account_group_buys_group_buy_id_group_buys_id_fk FOREIGN KEY (group_buy_id) REFERENCES public.group_buys(id) ON DELETE CASCADE;


--
-- Name: blood_test_sessions blood_test_sessions_telegram_username_accounts_telegram_usernam; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blood_test_sessions
    ADD CONSTRAINT blood_test_sessions_telegram_username_accounts_telegram_usernam FOREIGN KEY (telegram_username) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: blood_test_values blood_test_values_session_id_blood_test_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blood_test_values
    ADD CONSTRAINT blood_test_values_session_id_blood_test_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.blood_test_sessions(id) ON DELETE CASCADE;


--
-- Name: bt_conversations bt_conversations_telegram_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bt_conversations
    ADD CONSTRAINT bt_conversations_telegram_username_fkey FOREIGN KEY (telegram_username) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: compound_logs compound_logs_telegram_username_accounts_telegram_username_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compound_logs
    ADD CONSTRAINT compound_logs_telegram_username_accounts_telegram_username_fk FOREIGN KEY (telegram_username) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: gb_waitlist gb_waitlist_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gb_waitlist
    ADD CONSTRAINT gb_waitlist_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: gb_waitlist gb_waitlist_group_buy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gb_waitlist
    ADD CONSTRAINT gb_waitlist_group_buy_id_fkey FOREIGN KEY (group_buy_id) REFERENCES public.group_buys(id) ON DELETE CASCADE;


--
-- Name: glp1_logs glp1_logs_telegram_username_accounts_telegram_username_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glp1_logs
    ADD CONSTRAINT glp1_logs_telegram_username_accounts_telegram_username_fk FOREIGN KEY (telegram_username) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: group_buy_delivery_methods group_buy_delivery_methods_delivery_method_id_delivery_methods_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_delivery_methods
    ADD CONSTRAINT group_buy_delivery_methods_delivery_method_id_delivery_methods_ FOREIGN KEY (delivery_method_id) REFERENCES public.delivery_methods(id) ON DELETE CASCADE;


--
-- Name: group_buy_delivery_methods group_buy_delivery_methods_group_buy_id_group_buys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_delivery_methods
    ADD CONSTRAINT group_buy_delivery_methods_group_buy_id_group_buys_id_fk FOREIGN KEY (group_buy_id) REFERENCES public.group_buys(id) ON DELETE CASCADE;


--
-- Name: group_buy_products group_buy_products_group_buy_id_group_buys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_products
    ADD CONSTRAINT group_buy_products_group_buy_id_group_buys_id_fk FOREIGN KEY (group_buy_id) REFERENCES public.group_buys(id) ON DELETE CASCADE;


--
-- Name: group_buy_products group_buy_products_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_buy_products
    ADD CONSTRAINT group_buy_products_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: order_line_items order_line_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: plotter_cycles plotter_cycles_telegram_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plotter_cycles
    ADD CONSTRAINT plotter_cycles_telegram_username_fkey FOREIGN KEY (telegram_username) REFERENCES public.accounts(telegram_username) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict egunyf8Ohdfaa5hw63YLYoH0CC0cB7cU2gsNuqwjXyAVxI4fVYpN3L4OLplvvHV

