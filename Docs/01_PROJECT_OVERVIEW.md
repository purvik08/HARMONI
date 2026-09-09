# Project Overview

## Problem

SIH26123 asks for a decentralized coordination and collision-avoidance framework for at least 3 AMRs in a dynamic warehouse. Required capabilities include decentralized communication, multi-agent conflict resolution, task allocation/re-routing, local edge execution, and a fleet dashboard.

The official problem statement specifies zero inter-robot collisions and at least 20% reduction in total task completion time versus traditional stop-and-wait coordination for overlapping paths.

## Proposed solution

HARMONI treats every AMR as an autonomous computing participant rather than a passive vehicle controlled by a central fleet server.

Each robot maintains:
- local perception
- local navigation
- current task
- local world model
- neighboring robot state
- conflict/reservation information

Communication is selective. A robot does not need the complete state of every AMR if those robots cannot affect its current decision.

## Design objective

The architecture aims to make coordination overhead depend primarily on local interaction density and predicted conflicts rather than total fleet size.

This is a scalability design goal, not a guarantee of unlimited fleet size.

## What HARMONI is not

- It is not a claim that decentralized AMR coordination is a new field.
- It is not a claim that Zenoh automatically creates a MANET.
- It is not a guarantee of infinite robots.
- It is not a replacement for safety sensors with AI or networking.
- It is not a claim of industrial certification.
