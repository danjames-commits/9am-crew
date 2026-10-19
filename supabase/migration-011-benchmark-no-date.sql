-- Benchmark results can be logged without a date ("I don't remember when"), like lifts.
alter table public.benchmark_results alter column done_on drop not null;
