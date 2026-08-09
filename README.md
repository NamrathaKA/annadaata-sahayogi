# FarmPido Connect

MASTER PROMPT – FarmPido AI-Powered Collaborative Supply Chain Management Platform

Role

You are an Expert Software Architect, Senior Full Stack Engineer, UI/UX Designer, AI/ML Engineer, DevOps Engineer, Database Architect, and Product Manager with over 15 years of experience building scalable SaaS products.

Your task is to design and develop a production-ready, enterprise-grade, AI-powered web platform called FarmPido.

Do not generate demo code, placeholders, mock pages, or incomplete implementations. Every module must be fully functional, integrated, and deployable.

Project Vision

FarmPido is an AI-powered collaborative agriculture ecosystem designed to empower India's small and marginal farmers (1–10 acres of land) by enabling them to:

 Collaboratively sell crops

 Aggregate produce for better pricing

 Eliminate middlemen

 Share transportation costs

 Buy agricultural inputs collectively

 Access AI-driven farming assistance

 Use voice-first interactions in Kannada and other Indian languages

 Connect directly with buyers and logistics providers

The platform should be intuitive enough for farmers with limited digital literacy while being powerful enough for buyers, transport providers, and administrators.

Problem Statement

Indian farmers face several systemic challenges:

 Small land holdings reduce bargaining power.

 Dependence on intermediaries results in lower profits.

 Individual transportation is expensive.

 Farmers lack direct access to wholesale buyers.

 Agricultural inputs are costly due to fragmented purchasing.

 Limited awareness of government schemes and market trends.

 Low digital literacy makes existing applications difficult to use.

 Language barriers prevent effective use of technology.

FarmPido addresses these issues through AI, collaboration, multilingual support, and intelligent logistics.

Primary Objectives

The platform must:

 Increase farmer profits through aggregation.

 Reduce transportation costs using shared logistics.

 Enable transparent bidding between buyers and farmers.

 Simplify agriculture using AI.

 Support local languages.

 Be scalable to millions of users.

 Be secure and production-ready.

Target Users

Implement separate authentication, authorization, dashboards, workflows, and permissions for:

 Farmer

 Buyer

 Transport Provider

 Agricultural Supplier

 Government Officer (optional)

 Administrator

Technical Stack

Frontend

 Next.js 15 (App Router)

 React 19

 TypeScript

 Tailwind CSS

 shadcn/ui

 Framer Motion

 React Hook Form

 Zod

 TanStack Query

 Zustand

 Axios

Backend

 FastAPI

 Python 3.13+

 SQLAlchemy

 Alembic

 Pydantic

 JWT Authentication

 RBAC

Database

PostgreSQL

Redis

Vector Database (FAISS/pgvector)

AI

OpenAI GPT-5

LangChain

RAG

Whisper

YOLOv11

Sentence Transformers

OpenCV

Cloud

Firebase Authentication

Firebase Storage

AWS S3

Docker

GitHub Actions

NGINX

Vercel

Railway

Functional Requirements

Authentication

Support:

 Mobile OTP

 Email Login

 Google Login

 Role Selection

 Secure JWT Sessions

 Refresh Tokens

 Password Reset

Farmer Module

Allow farmers to:

Register

Manage Profile

Manage Farm

Manage Crops

Upload Images

View AI Insights

Track Orders

Track Income

Track Transport

Wallet

Government Schemes

Notifications

Buyer Module

Search

Filter

Bid

Purchase

Live Tracking

Invoices

Payments

Analytics

Order History

Supplier Module

Manage inventory

Receive bulk purchase requests

Approve orders

Delivery scheduling

Transport Module

Vehicle Management

Driver Management

Route Assignment

GPS Tracking

Fuel Estimation

Delivery Confirmation

Revenue Dashboard

Admin Dashboard

User Management

Content Management

Market Monitoring

Analytics

Reports

AI Monitoring

Fraud Detection

System Settings

Audit Logs

AI Modules

AI Crop Aggregation

Automatically cluster nearby farmers growing identical crops.

Optimize grouping using:

Location

Harvest Date

Quantity

Quality

Distance

Transport Cost

Generate a collaborative lot.

AI Smart Bidding

Predict

Fair Price

Expected Demand

Optimal Selling Window

Highest Probability Buyer

Provide recommendations before accepting bids.

AI Route Optimization

Optimize:

Pickup sequence

Vehicle utilization

Distance

Fuel

Time

Return optimized route.

AI Voice Assistant

Primary language:

Kannada

Additional:

Hindi

English

Tamil

Telugu

Malayalam

Features:

Speech Recognition

Speech Synthesis

Intent Detection

Navigation

Order Creation

Market Queries

Crop Advice

Government Schemes

Voice Navigation

AI Agriculture Assistant

Use Retrieval-Augmented Generation (RAG).

Knowledge Sources:

Government agriculture guidelines

Crop manuals

Weather data

Market data

Research papers

Agriculture universities

Capabilities:

Crop advice

Disease diagnosis

Market suggestions

Fertilizer recommendations

Loan information

Insurance

Schemes

AI Crop Disease Detection

Upload image

Detect

Disease

Pest

Leaf damage

Nutrient deficiency

Return:

Confidence Score

Annotated Image

Treatment

Nearby Agriculture Center

AI Demand Forecasting

Predict:

Future demand

Price fluctuations

Supply shortages

Harvest recommendations

AI Government Scheme Recommendation

Recommend schemes based on:

State

District

Farmer Category

Crop

Land Size

Language

UI/UX Requirements

Design a premium SaaS interface.

Requirements:

Responsive

Accessible

WCAG compliant

Dark Mode

Light Mode

Material-inspired components

Agriculture-themed illustrations

Micro animations

Loading Skeletons

Toast Notifications

Infinite Scrolling

Optimistic UI

Offline support (PWA)

Database Design

Design a fully normalized PostgreSQL schema including:

Users

Roles

Permissions

Farms

Crops

Crop Images

Aggregated Lots

Buyers

Bids

Orders

Deliveries

Vehicles

Drivers

Suppliers

Purchase Requests

Payments

Wallets

Notifications

Weather

Market Prices

Government Schemes

AI Conversations

Disease Detection

Audit Logs

Reviews

Ratings

Support Tickets

API Design

Generate REST APIs for every module.

Each endpoint must include:

Validation

Authentication

Authorization

Error Handling

Pagination

Sorting

Filtering

OpenAPI Documentation

Security

Implement:

JWT

RBAC

Password Hashing

Rate Limiting

CSRF

XSS

SQL Injection Prevention

Input Validation

Secure Headers

Audit Logs

Encryption for Sensitive Data

DevOps

Include:

Docker

Docker Compose

GitHub Actions

CI/CD

Environment Variables

Production Build

Logging

Health Checks

Monitoring

Backup Strategy

Deployment Guide

Testing

Generate:

Unit Tests

Integration Tests

API Tests

End-to-End Tests

Documentation

Produce comprehensive documentation including:

 Software Requirements Specification (SRS)

 High-Level Architecture Diagram

 Low-Level Design

 Database ER Diagram

 API Documentation

 Deployment Guide

 User Manual

 Admin Manual

 Testing Strategy

 Maintenance Guide

Development Strategy

Develop the project iteratively.

For every module:

 Explain the architecture.

 Design the database.

 Build backend APIs.

 Build frontend UI.

 Integrate frontend with backend.

 Add validations.

 Add testing.

 Verify functionality.

 Commit clean code before moving to the next module.

Do not skip steps.

Code Quality Standards

 Follow SOLID principles.

 Use Clean Architecture.

 Keep business logic separate from UI.

 Write reusable, modular components.

 Use meaningful naming conventions.

 Add comments only where necessary.

 Ensure code is production-ready and maintainable.

Final Deliverables

Generate a complete, deployable project containing:

 Responsive frontend

 Fully functional backend

 Database schema and migrations

 Authentication system

 AI integrations

 Voice assistant

 Multilingual support

 Docker configuration

 CI/CD pipeline

 Seed data

 API documentation

 Test suites

 Deployment scripts

 README with setup instructions

The final output should resemble a commercial SaaS platform ready for deployment and capable of supporting thousands of concurrent users, with a strong focus on usability for farmers and extensibility for future features. I WANT THE WORKING MODEL LIKE IF I REGISYER IT SH WORK , SAY for xeample  there will be farmer regestering, hotel resgistring and delivery guy registering all of them shd be able to access and it shd work like it's connected even the voice agent shd work mainy in kannda like the farmer can't read english it shd be translated to kannada for hotel people might not know kannada and it shd trnslated to language they want evn for delivery guy, sometimes farmer can't register because he'll be illiterate he can use it by voice assistant he shd not face any problem of literacy like that u give

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://annadaata-sahayogi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/09e88787-5d10-473f-8de0-8feb9b82fb1b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
