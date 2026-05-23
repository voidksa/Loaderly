namespace Loaderly;

internal enum TrimTransitionKind
{
    None,
    Fade,
    Blur,
    Smooth,
    SlideLeft,
    DipToBlack,
    DipToWhite,
    Circle
}

internal sealed record TrimSegment(TimeSpan Start, TimeSpan End)
{
    public TimeSpan Duration => End - Start;
}

internal sealed record TrimCutRange(TimeSpan Start, TimeSpan End, TrimTransitionKind TransitionAfter)
{
    public TimeSpan Duration => End - Start;
}

internal sealed record TrimComposition(
    IReadOnlyList<TrimSegment> Segments,
    IReadOnlyList<TrimTransitionKind> Transitions)
{
    public static readonly TimeSpan DefaultTransitionDuration = TimeSpan.FromMilliseconds(450);

    public TimeSpan Duration
    {
        get
        {
            var duration = TimeSpan.Zero;
            for (var index = 0; index < Segments.Count; index++)
            {
                duration += Segments[index].Duration;
                if (index < Segments.Count - 1)
                {
                    duration -= EffectiveTransitionDuration(Segments[index], Segments[index + 1], Transitions[index]);
                }
            }

            return duration < TimeSpan.Zero ? TimeSpan.Zero : duration;
        }
    }

    public static TrimComposition Normalize(
        IEnumerable<TrimSegment> segments,
        IEnumerable<TrimTransitionKind>? transitions = null)
    {
        var normalizedSegments = segments
            .Where(segment => segment.Start >= TimeSpan.Zero && segment.End - segment.Start >= TimeSpan.FromMilliseconds(250))
            .OrderBy(segment => segment.Start)
            .ThenBy(segment => segment.End)
            .ToList();
        var transitionCount = Math.Max(0, normalizedSegments.Count - 1);
        var normalizedTransitions = Enumerable
            .Repeat(TrimTransitionKind.None, transitionCount)
            .ToList();

        return new TrimComposition(normalizedSegments, normalizedTransitions);
    }

    public static TrimComposition FromDeletedRanges(
        TimeSpan sourceStart,
        TimeSpan sourceEnd,
        IEnumerable<TrimCutRange> deletedRanges)
    {
        if (sourceStart < TimeSpan.Zero)
        {
            sourceStart = TimeSpan.Zero;
        }

        if (sourceEnd <= sourceStart)
        {
            return Normalize([]);
        }

        var cuts = deletedRanges
            .Where(cut => cut.End > sourceStart && cut.Start < sourceEnd && cut.Duration >= TimeSpan.FromMilliseconds(250))
            .Select(cut => cut with
            {
                Start = cut.Start < sourceStart ? sourceStart : cut.Start,
                End = cut.End > sourceEnd ? sourceEnd : cut.End
            })
            .OrderBy(cut => cut.Start)
            .ThenBy(cut => cut.End)
            .ToList();

        var mergedCuts = new List<TrimCutRange>();
        foreach (var cut in cuts)
        {
            if (mergedCuts.Count == 0 || cut.Start > mergedCuts[^1].End)
            {
                mergedCuts.Add(cut);
                continue;
            }

            var previous = mergedCuts[^1];
            mergedCuts[^1] = previous with
            {
                End = cut.End > previous.End ? cut.End : previous.End,
                TransitionAfter = TrimTransitionKind.None
            };
        }

        var segments = new List<TrimSegment>();
        var transitions = new List<TrimTransitionKind>();
        var cursor = sourceStart;
        foreach (var cut in mergedCuts)
        {
            if (cut.Start > cursor)
            {
                segments.Add(new TrimSegment(cursor, cut.Start));
                transitions.Add(TrimTransitionKind.None);
            }

            cursor = cut.End > cursor ? cut.End : cursor;
        }

        if (cursor < sourceEnd)
        {
            segments.Add(new TrimSegment(cursor, sourceEnd));
        }

        return Normalize(segments, transitions);
    }

    public static TimeSpan EffectiveTransitionDuration(
        TrimSegment previous,
        TrimSegment next,
        TrimTransitionKind transition)
    {
        return TimeSpan.Zero;
    }

    public static IReadOnlyList<SubtitleCue> RetimeSubtitleCues(
        IEnumerable<SubtitleCue> cues,
        TrimComposition composition)
    {
        var retimed = new List<SubtitleCue>();
        var outputOffset = TimeSpan.Zero;
        for (var index = 0; index < composition.Segments.Count; index++)
        {
            var segment = composition.Segments[index];
            foreach (var cue in SrtSubtitleService.CuesForRange(cues, segment.Start, segment.End))
            {
                var start = outputOffset + (cue.Start - segment.Start);
                var end = outputOffset + (cue.End - segment.Start);
                if (end > start)
                {
                    retimed.Add(cue with { Start = start, End = end });
                }
            }

            outputOffset += segment.Duration;
            if (index < composition.Segments.Count - 1)
            {
                outputOffset -= EffectiveTransitionDuration(
                    segment,
                    composition.Segments[index + 1],
                    composition.Transitions[index]);
            }
        }

        return retimed
            .Where(cue => cue.End > cue.Start && !string.IsNullOrWhiteSpace(cue.Text))
            .OrderBy(cue => cue.Start)
            .ToList();
    }

    public static string TransitionLabel(TrimTransitionKind transition)
    {
        return transition switch
        {
            TrimTransitionKind.Fade => "Fade",
            TrimTransitionKind.Blur => "Blur",
            TrimTransitionKind.Smooth => "Smooth",
            TrimTransitionKind.SlideLeft => "Slide",
            TrimTransitionKind.DipToBlack => "Dip black",
            TrimTransitionKind.DipToWhite => "Dip white",
            TrimTransitionKind.Circle => "Circle",
            _ => "None"
        };
    }

    public static TrimTransitionKind TransitionFromLabel(string? label)
    {
        return TrimTransitionKind.None;
    }

    private static TimeSpan Min(TimeSpan left, TimeSpan right)
    {
        return left <= right ? left : right;
    }
}
